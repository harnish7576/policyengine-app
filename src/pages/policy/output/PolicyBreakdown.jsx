import { useSearchParams } from "react-router-dom";
import style from "../../../style";
import { motion } from "framer-motion";

export default function PolicyBreakdown(props) {
  const { policyLabel, metadata, impact, timePeriod, region } = props;
  const [searchParams, setSearchParams] = useSearchParams();

  const regionObj = metadata.economy_options.region.find(
    (elem) => elem.name === region,
  );

  const handleItemClick = (focusTarget) => {
    let newSearch = new URLSearchParams(searchParams);

    newSearch.set("focus", focusTarget);

    setSearchParams(newSearch);
  };
  let regionLabel;
  // This is a workaround for enhanced_us that should be changed
  // if and when it is treated as something other than a "region"
  // by the back end
  if (regionObj?.name === "enhanced_us") {
    regionLabel = "the US";
  } else if (regionObj) {
    regionLabel = regionObj.label;
  } else {
    regionLabel = "undefined region";
  }

  const title = `${policyLabel} in ${regionLabel}, ${timePeriod}`;
  const bottomText =
    "Click on an option on the left panel to view more details.";

  // Define the impact items to be included in the output
  const budgetaryImpact = impact.budget.budgetary_impact;
  const povertyOverview = impact.poverty.poverty.all;
  const decileOverview = impact.intra_decile.all;
  let povertyRateChange = null;
  if (povertyOverview.baseline === 0) {
    console.error(
      "PolicyBreakdown: baseline poverty rate reported as 0; API error likely",
    );
    povertyRateChange = Infinity;
  } else {
    povertyRateChange =
      (povertyOverview.reform - povertyOverview.baseline) /
      povertyOverview.baseline;
  }

  const listItems = [
    {
      value: budgetaryImpact,
      type: "budgetaryImpact",
      focusTarget: "policyOutput.budgetaryImpact.overall",
      formatOptions: {
        currencyLabel: metadata.currency,
      },
    },
    {
      value: povertyRateChange,
      type: "povertyRateChange",
      focusTarget: "policyOutput.povertyImpact.regular.byAge",
      formatOptions: {
        percentage: true,
        signFlip: true,
      },
    },
    {
      value: decileOverview,
      type: "winnersLosersPercent",
      focusTarget: "policyOutput.winnersAndLosers.incomeDecile",
    },
  ];

  // Pass data structure to template
  return (
    <>
      <BreakdownTemplate
        data={listItems}
        title={title}
        bottomText={bottomText}
        onItemClick={handleItemClick}
      />
    </>
  );
}

/**
 * Template for taking pre-formatted data and returning JSX of a breakdown page
 * @param {Object} props
 * @param {Array<Object>} props.data An array of individual data objects that will become
 * each line in the template
 * @param {Number} props.data.value The numerical value of each line item
 * @param {Function} props.data.formatted The string formatter function associated with each line
 * @returns {import("react-markdown/lib/react-markdown").ReactElement}
 */
function BreakdownTemplate(props) {
  const { data, title, bottomText, onItemClick } = props;

  const COLORS = {
    pos: style.colors.BLUE,
    neg: style.colors.DARK_GRAY,
  };

  // Iterate over the data...
  const lineItems = data.map((item, index) => {
    // If doing income decile display, use custom function
    if (item.type === "winnersLosersPercent") {
      return (
        <div
          key={index}
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
          }}
        >
          {formatWinnersLosers(item, onItemClick)}
        </div>
      );
    }

    // Otherwise, move through like normal
    const signFlip = item.formatOptions.signFlip;

    // Return a formatted line containing the string
    // and value, colored based on the value contained
    let color = null;

    if (item.value > 0) {
      if (signFlip) {
        color = COLORS.neg;
      } else {
        color = COLORS.pos;
      }
    } else {
      if (signFlip) {
        color = COLORS.pos;
      } else {
        color = COLORS.neg;
      }
    }

    const [descStart, descEnd] = formatDesc(item.value, item.type);
    const focusTarget = item.focusTarget;
    const formattedValue = formatValue(
      item.value,
      item.type,
      item.formatOptions,
    );

    return (
      <div
        key={index}
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "20px",
        }}
      >
        <motion.h2
          style={{
            fontSize: 22,
            cursor: "pointer",
          }}
          whileHover={{
            backgroundColor: style.colors.BLUE_LIGHT,
            fontWeight: 500,
          }}
          transition={{ duration: 0.001 }}
          onClick={() => onItemClick(focusTarget)}
        >
          {descStart}
          &nbsp;
          <span
            style={{
              color: color,
            }}
          >
            {formattedValue}
          </span>
          &nbsp;
          {descEnd}
        </motion.h2>
      </div>
    );
  });

  return (
    <div
      style={{
        minHeight: "100%",
        padding: "0px 20px",
      }}
    >
      <h2
        style={{
          marginBottom: "30px",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          width: "100%",
          padding: "10px 10px 0 10px",
          margin: "0 10px",
          borderLeft: `2px solid ${COLORS.pos}`,
          display: "flex",
          flexDirection: "column",
          gap: "30px",
          alignItems: "flex-start",
          justifyContent: "center",
        }}
      >
        {lineItems}
      </div>
      <p
        style={{
          paddingTop: "40px",
        }}
      >
        {bottomText}
      </p>
    </div>
  );
}

/**
 * Creates a display string based on an input value
 * @param {Number|String} value The data value corresponding to the description
 * @param {String} type The type of value to be formatted; corresponds with
 * certain default values defined in the function
 * @returns {Array<String, String||null>} The text to be displayed before the formatted
 * value and the text to be displayed after
 */
function formatDesc(value, type) {
  let action = "";

  // Declare template nouns for output when value is 0
  const templateStringsZero = {
    budgetaryImpact: "Has no impact on the budget",
    povertyRateChange: "Has no impact on the poverty rate",
    winnersPercent:
      "Under your reform, none of the population would receive a higher net income",
    losersPercent:
      "Under your reform, none of the population would receive a lower net income",
  };

  const templateStringsError = {
    budgetaryImpact: "budget",
    povertyRateChange: "poverty rate",
    winnersPercent: "percentage of households receiving a higher net income",
    losersPercent: "percentage of households receiving a lower net income",
  };

  // Handle zero cases
  if (value === 0) {
    return [templateStringsZero[type], null];
  }

  // Handle error cases; doing so after 0 because 0 is falsy
  if (!value || Number.isNaN(value)) {
    return [
      `There was an error in calculating your policy reform's impact on the ${templateStringsError[type]}`,
      null,
    ];
  }

  // Declare default "action" value and manual overrides
  const actions = {
    default: ["Raises", "Lowers"],
    budgetaryImpact: ["Raises", "Costs"],
  };

  // Determine action
  const key = Object.keys(actions).includes(type) ? type : "default";
  if (value > 0) {
    action = actions[key][0];
  } else {
    action = actions[key][1];
  }

  // Declare template strings for output; must be after all processing
  // to enable proper string construction
  const templateStrings = {
    budgetaryImpact: [`${action}`, ""],
    povertyRateChange: [`${action} poverty by`, ""],
    winnersPercent:
      "Your reform would raise the net income for this percent " +
      "of the population:",
    losersPercent:
      "Your reform would lower the net income for this percent " +
      "of the population:",
  };

  // Return string to put before numerical value and string to put after
  return [templateStrings[type][0], templateStrings[type][1]];
}

/**
 * Format a given policy parameter's value
 * @param {Number} value The value to be formatted
 * @param {String} type The data item represented by the value
 * @param {Object} [options] An object containing a series of optional args
 * @param {String} [options.currencyLabel] The currency label to be displayed
 * before the value
 * @param {boolean} [options.percentage] Whether or not the input is a percentage value
 * @param {boolean} [options.displayZero] If true, values of zero will be displayed
 * @returns {String||null} The formatted value, as a string, if it's not 0
 */
function formatValue(value, type, options) {
  let { currencyLabel, percentage, displayZero } = options;
  let displayValue = "";
  let prefixLabel = "";
  let postfixLabel = "";

  // Just in case
  value = Number(value);

  // If the value is 0 and we're not manually flagging to display
  // the value, return null
  if (value === 0 && !displayZero) {
    return null;
  }

  // Remove negative signs
  displayValue = Math.abs(Number(value));

  // If percentage, multiply by 100
  if (percentage) {
    displayValue *= 100;
  }

  // Break large numbers down
  [displayValue, postfixLabel] = formatPowers(displayValue);

  // Round to one decimal point
  displayValue = displayValue.toFixed(1);

  // If display value is now less than 0.1, display as "<0.1"
  if (displayValue < 0.1) {
    displayValue = 0.1;
    prefixLabel = "<";
  }

  // Declare how we'll template these value-strings
  const templateValues = {
    budgetaryImpact: `${prefixLabel}${currencyLabel}${displayValue}${postfixLabel}`,
    povertyRateChange: `${prefixLabel}${displayValue}%`,
    winnersLosersPercent: `${prefixLabel}${displayValue}%`,
  };

  return templateValues[type];
}

/**
 * Formats the rates at which households lose or gain net income,
 * as the logic behind it is non-standard
 * @param {Object<Array>} decileOverview The intra_decile_all value from
 * the relevant "impact" object
 * @returns {React.JSX} The formatted JSX, as this can contain anywhere
 * between 0 and 2 values
 */
function formatWinnersLosers(item, onItemClick) {
  const { value: decileOverview, focusTarget } = item;
  const winnersPercent =
    decileOverview["Gain more than 5%"] + decileOverview["Gain less than 5%"];
  const losersPercent =
    decileOverview["Lose more than 5%"] + decileOverview["Lose less than 5%"];

  // If both values are 0...
  if (!winnersPercent && !losersPercent) {
    return (
      <motion.h2
        style={{
          fontSize: 22,
          cursor: "pointer",
        }}
        whileHover={{
          backgroundColor: style.colors.BLUE_LIGHT,
        }}
        transition={{ duration: 0.001 }}
        onClick={() => onItemClick(focusTarget)}
      >
        Does not affect anyone&apos;s net income
      </motion.h2>
    );
  }

  // At least 1 isn't 0; process data
  const COLORS = {
    pos: style.colors.BLUE,
    neg: style.colors.DARK_GRAY,
  };

  const winnersColor = winnersPercent > 0 ? COLORS.pos : COLORS.neg;
  const losersColor = losersPercent > 0 ? COLORS.neg : COLORS.pos;

  const winnersValue = formatValue(winnersPercent, "winnersLosersPercent", {
    percentage: true,
  });
  const losersValue = formatValue(losersPercent, "winnersLosersPercent", {
    percentage: true,
  });

  // If both aren't 0...
  if (winnersPercent && losersPercent) {
    return (
      <motion.h2
        style={{
          fontSize: 22,
          cursor: "pointer",
        }}
        whileHover={{
          backgroundColor: style.colors.BLUE_LIGHT,
        }}
        transition={{ duration: 0.001 }}
        onClick={() => onItemClick(focusTarget)}
      >
        Increases net income for&nbsp;
        <span
          style={{
            color: winnersColor,
          }}
        >
          {winnersValue}
        </span>
        &nbsp;of people, and decreases it for&nbsp;
        <span
          style={{
            color: losersColor,
          }}
        >
          {losersValue}
        </span>
        &nbsp;of people
      </motion.h2>
    );
  }

  // Otherwise, conditionally return whichever is correct
  return (
    <motion.h2
      style={{
        fontSize: 22,
        cursor: "pointer",
      }}
      whileHover={{
        backgroundColor: style.colors.BLUE_LIGHT,
        fontWeight: 500,
      }}
      transition={{ duration: 0.001 }}
      onClick={() => onItemClick(focusTarget)}
    >
      {`${winnersPercent ? "Raises" : "Lowers"} net income for`}
      &nbsp;
      <span
        style={{
          color: winnersPercent ? winnersColor : losersColor,
        }}
      >
        {winnersPercent ? winnersValue : losersValue}
      </span>
      &nbsp;of people
    </motion.h2>
  );
}

/**
 * Break large numbers into units of million, trillion, etc.
 * @param {Number} value The value to be processed
 * @returns {Array<Number, String>} An array, where the first item is the new display value,
 * and the second is its postfix label
 */
function formatPowers(value) {
  const powers = new Map([
    [15, "quadrillion"],
    [12, "trillion"],
    [9, "billion"],
    [6, "million"],
  ]);
  let label = "";
  let displayValue = value;

  for (const [power, unit] of powers) {
    if (value / Math.pow(10, power) >= 1) {
      displayValue = value / Math.pow(10, power);
      label = " " + unit;
      break;
    }
  }
  return [Number(displayValue), label];
}
