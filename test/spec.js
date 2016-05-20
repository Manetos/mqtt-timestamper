'use strict';

var assert = require('assert');

var sinon = require('sinon');

var Timestamper = require('../lib');

describe('Timestamper', function() {
    beforeEach(function() {
        this.client = {
            connected: false,
            on: sinon.spy(),
            subscribe: sinon.spy(),
            publish: sinon.spy(),
        };
    });
    it('should subscribe if client is connected without connect event', function() {
        this.client.connected = true;
        /* jshint nonew: false */
        new Timestamper(this.client, '#', sinon.stub().returns('newTopic'));
        assert(this.client.subscribe.withArgs('#').calledOnce);
    });
    it('should subscribe on connect', function() {
        /* jshint nonew: false */
        new Timestamper(this.client, '#', sinon.stub().returns('newTopic'));
        assert(!this.client.subscribe.withArgs('#').called);
        this.client.on.withArgs('connect').yield();
        assert(this.client.subscribe.withArgs('#').calledOnce);
    });
    it('should add timestamp if missing', function() {
        /* jshint nonew: false */
        new Timestamper(this.client, '#', sinon.stub().returns('newTopic'));
        this.client.on.withArgs('message').yield('woop', JSON.stringify({}));
        var rawMsg = this.client.publish.withArgs('newTopic').getCall(0).args[1];
        var timestamp = JSON.parse(rawMsg).timestamp;
        assert(!!timestamp);
    });
    it('should not add timestamp if it already exists', function() {
        /* jshint nonew: false */
        new Timestamper(this.client, '#', sinon.stub().returns('newTopic'));
        var timestamp = new Date().toISOString();
        this.client.on.withArgs('message').yield('woop', JSON.stringify({
            timestamp: timestamp
        }));
        var rawMsg = this.client.publish.withArgs('newTopic').getCall(0).args[1];
        assert.strictEqual(JSON.parse(rawMsg).timestamp, timestamp);
    });
    it('should not publish anything given invalid json', function() {
        /* jshint nonew: false */
        new Timestamper(this.client, '#', sinon.stub().returns('newTopic'));
        this.client.on.withArgs('message').yield('woop', 'invalid json');
        assert(!this.client.publish.called);
    });
    it('shoudl pass through publishOptions to publish', function() {
        var publishOptions = {
            qos: 2,
            retain: true
        };

        /* jshint nonew: false */
        new Timestamper(this.client, '#', sinon.stub().returns('newTopic'), publishOptions);
        this.client.on.withArgs('message').yield('woop', JSON.stringify({}));
        assert.strictEqual(this.client.publish.getCall(0).args[2], publishOptions);
    });
    it('should apply topicTransformer', function() {
        var transformer = sinon.stub().returns('newTopic');
        /* jshint nonew: false */
        new Timestamper(this.client, '#', transformer);
        this.client.on.withArgs('message').yield('woop', JSON.stringify({}));
        assert(transformer.withArgs('woop').calledOnce);
    });
});
