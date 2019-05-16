const test = true;
const month = 5; //numeric month

const config = {
  month: month,
  test: false,
  outputRange: "",
  outPutConfig: {
    spreadsheetId: "", //Blog 2019 Google Sheet
    range: ""
  },
  inPutConfig: {
    person: {
      spreadsheetId: "",
      range: ""
    },
    person2: {
      spreadsheetId: "",
      range: ""
    }
  }
};

const testConfig = {
  month: 1, //always jan for test
  test: true,
  outputRange: "",
  outPutConfig: {
    spreadsheetId: "", //Blog 2019 Google Sheet
    range: ""
  },
  inPutConfig: {
    test: {
      spreadsheetId: "",
      range: ""
    }
  }
};

var exports = test ? testConfig : config;

module.exports = exports;
