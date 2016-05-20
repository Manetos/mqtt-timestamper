'use strict';

var debug = require('debug')('mqtt-timestamper');

function Timestamper(client, sourceTopic, topicTransformer, publishOptions) {
    this.client = client;
    this.sourceTopic = sourceTopic;

    if (client.connected) {
        this._subscribe();
    }
    this.connectListener = client.on('connect', this._subscribe.bind(this));
    this.messageListener = client.on('message', function(topic, rawMsg) {
        try {
            var message = JSON.parse(rawMsg);
            var newTopic = topicTransformer(topic);
            if (!message.timestamp) {
                message.timestamp = new Date().toISOString();
            }

            client.publish(newTopic, JSON.stringify(message), publishOptions, function(err) {
                if (err) {
                    console.error('Failed to publish message to MQTT', err);
                }
            });
        }
        catch (e) {
            debug('Invalid json message: ' + rawMsg.toString());
        }
    });
}

Timestamper.prototype._subscribe = function _subscribe() {
    this.client.subscribe(this.sourceTopic);
};

Timestamper.prototype.stop = function stop() {
    this.client.unsubscribe(this.sourceTopic);
    this.client.removeListener('connect', this.connectListener);
    this.client.removeListener('message', this.messageListener);
};

module.exports = Timestamper;
