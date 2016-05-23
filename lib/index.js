'use strict';

var debug = require('debug')('mqtt-timestamper');

function Timestamper(client, sourceTopic, topicTransformer, publishOptions) {
    this.client = client;
    this.sourceTopic = sourceTopic;

    function messageHandler(topic, rawMsg) {
        try {
            var message = JSON.parse(rawMsg);
            if (typeof message !== 'object' || Array.isArray(message)) {
                debug('Will not republish message of type ' + typeof message +
                        ' from topic ' + topic);
                return;
            }
            var newTopic = topicTransformer(topic);
            if (!message.timestamp) {
                message.timestamp = new Date().toISOString();
            }
            debug('Republishing message to ' + newTopic + '\n', message);

            client.publish(newTopic, JSON.stringify(message), publishOptions, function(err) {
                if (err) {
                    console.error('Failed to publish message to MQTT', err);
                }
            });
        }
        catch (e) {
            debug('Invalid json message from topic ' + topic + ': ' + rawMsg.toString());
        }
    }

    if (client.connected) {
        this._subscribe();
    }

    this.connectListener = this._subscribe.bind(this);
    this.messageListener = messageHandler;

    client.on('connect', this.connectListener);
    client.on('message', this.messageListener);
}

Timestamper.prototype._subscribe = function _subscribe() {
    this.client.subscribe(this.sourceTopic, {
        qos: 2
    });
};

Timestamper.prototype.stop = function stop() {
    this.client.removeListener('connect', this.connectListener);
    this.client.removeListener('message', this.messageListener);
};

Timestamper.prototype.unsubscribe = function unsubscribe() {
    this.client.unsubscribe(this.sourceTopic);
};

module.exports = Timestamper;
