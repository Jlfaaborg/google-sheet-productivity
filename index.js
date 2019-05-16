const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");

// If modifying these scopes, devare token.json.
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow compvares for the first
// time.
const TOKEN_PATH = "token.json";

// Load client secrets from a local file.
fs.readFile("credentials.json", (err, content) => {
  if (err) return console.log("Error loading client secret file:", err);
  // Authorize a client with credentials, then call the Google Sheets API.
  authorize(JSON.parse(content), doWork);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES
  });
  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question("Enter the code from that page here: ", code => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err)
        return console.error(
          "Error while trying to retrieve access token",
          err
        );
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), err => {
        if (err) return console.error(err);
        console.log("Token stored to", TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * What Is Called After The Authorization
 */
async function doWork(auth) {
  /**
   * Parses one Cell
   * @param raw One Cell To Be Parsed
   */
  function parseData(raw) {
    var keywordOne = raw.substring(
      raw.indexOf("Keyword #1:"),
      raw.lastIndexOf("Keyword #2:")
    );
    keywordOne = keywordOne.replace("Keyword #1:", ""); //removes "keyword#1" from the string
    keywordOne = keywordOne.trim(); //remove whitespace

    var keywordTwo = raw.substring(
      raw.indexOf("Keyword #2:"),
      raw.lastIndexOf("Title:")
    );
    keywordTwo = keywordTwo.replace("Keyword #2:", "");
    keywordTwo = keywordTwo.trim();

    var title = raw.substring(raw.indexOf("Title:"), raw.lastIndexOf("Focus:"));
    title = title.replace("Title:", "");
    title = title.trim();

    var focus = raw.substring(raw.indexOf("Focus"));
    focus = focus.replace("Focus:", "");
    focus = focus.trim();

    return { keywordOne, keywordTwo, title, focus };
  }

  /**
   * Get's The Row Cooresponding to The Doctor's Name on
   * The Output Sheet
   * @param config OutPut Sheet Configuration
   */
  function getDoctors(config) {
    var positions = [];
    var i = 31; // Doctors's name start on Row 31
    sheets.spreadsheets.values.get(config, (err, res) => {
      if (err) return console.log("The API returned an error: " + err);
      var rows = res.data.values;
      if (rows.length) {
        rows.map(row => {
          var item = {
            name: row[0],
            position: i
          };
          i++;
          positions.push(item);
        });
      }
    });
    return positions;
  }

  /**
   * Puts The Data Into Out Sheet
   * @param data Data To Be Put Into Cell
   * @param positionData Data With Position Cooresponding to Doctor's Name
   */
  async function doOutPut(data, positionData) {
    var item = []; //data
    var values = []; //for update bunch of items[]
    var batch = []; //bunch of values to be updated

    data.forEach(element => {
      position = positionData.find(obj => {
        return obj.name === element.name;
      });
      if (position != undefined) {
        var position = position.position;
        var title =
          element.info.title.length == 0 ? "" : `Title : ${element.info.title}`;
        var focus =
          element.info.focus.length == 0 ? "" : `Focus : ${element.info.focus}`;

        var value = {
          position: position,
          value: [
            element.info.keywordOne,
            element.info.keywordTwo,
            title + "\n" + focus
          ]
        };
        values.push(value);
      } else {
        //if you cant find a doctor's name in Out
        addThese.push(element.name);
      }
    });

    //get them values in order based on position
    values = values.sort((a, b) => {
      return a.position - b.position;
    });

    //Every 10 Cells ||
    //If Position [i+1] - [i] != 1 (values[1].position = 3 -> values[2].position != 4, ETC.) ||
    //If Last One
    // DO a new batch.
    //Pretty much this breaks up the calls so its not all consecutive or that the calls wont overide wrong cell
    for (var i = 0, j = values[0].position; i < values.length; i++) {
      item.push(values[i].value);
      if (
        (i % 10 == 0 && i != 0) ||
        i == values.length - 1 ||
        (values[i + 1] && values[i + 1].position - values[i].position != 1)
      ) {
        var valueRange = {
          range: config.test
            ? config.testoutRange
            : config.outRange;
          majorDimension: "ROWS",
          values: item
        };
        batch.push(valueRange);
        if (values[i + 1]) {
          j = values[i + 1].position;
        }
        item = [];
      }
    }

    await sheets.spreadsheets.values.batchUpdate(
      {
        spreadsheetId: config.spreadsheetId,
        resource: {
          valueInputOption: "RAW",
          data: batch
        }
      },
      (err, res) => {
        if (err) return console.log("The API returned an error: " + err);
      }
    );
  }

  //start of code
  const config = require("./config");
  const sheets = google.sheets({ version: "v4", auth });
  var data = [];
  var addThese = [];

  var doctorPosition = getDoctors(config.outPutConfig);

  //For Every SEO Specialists Sheet Do Stuff
  for (var person in config.inPutConfig) {
    if (config.inPutConfig.hasOwnProperty(person)) {
      var indConfig = config.inPutConfig[person];
      await sheets.spreadsheets.values.get(indConfig, (err, res) => {
        if (err) return console.log("The API returned an error: " + err);
        var rows = res.data.values;
        if (rows.length) {
          rows.map(row => {
            var item = {
              name: row[0],
              info: parseData(row[config.month])
            };
            data.push(item);
          });
        } else {
          console.log("No data found.");
        }
        doOutPut(data, doctorPosition);
        data = [];
      });
    }
  }
  console.log(`Need To Add: ${addThese}`);
}
