'use strict';

var _ = require('lodash');
var debug = require('debug')('mqtt-timestamper');

function Timestamper(client, sourceTopic, topicTransformer, publishOptionsOverrides) {
    this.client = client;
    this.sourceTopic = sourceTopic;

    function parseMessage(topic, rawMsg) {
        try {
            return JSON.parse(rawMsg);
        }
        catch (e) {
            return null;
        }
    }

    function parseAndValidate(topic, rawMsg, packet) {
        var message = parseMessage(topic, rawMsg);
        if (message === null) {
            debug('Invalid json message from topic ' + topic + ': ' + rawMsg.toString());
        }
        if (typeof message !== 'object' || Array.isArray(message)) {
            debug('Will not republish message of type ' + typeof message +
                    ' from topic ' + topic);
            return;
        }
        if (packet.retain) {
            debug('Not forwarding retained message from topic ' + topic);
            return;
        }
        return message;
    }

    function messageHandler(topic, rawMsg, packet) {
        var message = parseAndValidate(topic, rawMsg, packet);
        if (!message) {
            return;
        }

        var newTopic = topicTransformer(topic);
        if (!message.timestamp) {
            message.timestamp = new Date().toISOString();
        }
        debug('Republishing message to ' + newTopic + '\n', message);

        var publishOptions = _.defaults({}, publishOptionsOverrides, {
            qos: packet.qos
        });

        client.publish(newTopic, JSON.stringify(message), publishOptions, function(err) {
            if (err) {
                console.error('Failed to publish message to MQTT', err);
            }
        });
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
