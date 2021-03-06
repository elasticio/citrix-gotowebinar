/* eslint new-cap: [2, {"capIsNewExceptions": ["Q"]}] */
var Q = require('q');
var elasticio = require('elasticio-node');
var messages = elasticio.messages;
var HTTP = require("q-io/http");

module.exports.process = processAction;

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
function processAction(msg, cfg) {
  var self = this;

  function addParticipant(data) {
    var webinarKey = cfg.webinarKey;
    var organizerKey = cfg.organizerKey;
    var request = {
      url: "https://api.citrixonline.com/G2W/rest/organizers/" + organizerKey + "/webinars/" + webinarKey + "/registrants?resendConfirmation=false",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": "OAuth oauth_token=" + cfg.oauth.access_token
      },
      body: [JSON.stringify(data)]
    };
    console.log('Sending POST to %s', request.url);
    return HTTP.request(request);
  }

  function readResponse(response) {
    var status = response.status;
    console.log('Received response with code=%s', status);
    return response.body.read().then(function(result) {
      return {
        status: status,
        body: result.toString()
      }
    });
  }

  function emitResponse(response) {
    var status = response.status;
    var body = response.body;
    if (status === 201) {
      var data = messages.newMessageWithBody(body);
      self.emit('data', data);
    } else {
      throw new Error("Unexpected return code " + status + " - " + JSON.stringify(body));
    }
  }

  function emitError(e) {
    console.log('Oops! Error occurred');
    self.emit('error', e);
  }

  function emitEnd() {
    console.log('Finished execution');
    self.emit('end');
  }

  Q(msg.body)
    .then(addParticipant)
    .then(readResponse)
    .then(emitResponse)
    .fail(emitError)
    .done(emitEnd);
}
