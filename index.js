var async = require('async');
var request = require('request');
var ntlm = require('./lib/ntlm');
var KeepAlive = require('agentkeepalive').HttpsAgent;
var _ = require('lodash');

var makeRequest = function(method, options, params, callback) {

   /* if (options.url.toLowerCase().indexOf('https://') === 0) {
        KeepAlive = KeepAlive.HttpsAgent;
    }*/

    var keepaliveAgent = new KeepAlive();

    if (!options.workstation) options.workstation = '';
    if (!options.ntlm_domain) options.ntlm_domain = '';
    if (!options.headers) options.headers = {};
    if (!options.contentType)  {
        options.contentType = 'application/json';

    }
    //console.log("content type is:" + options.contentType);
    function startAuth($) {
        var type1msg = ntlm.createType1Message(options);
        options.method = method;
        _.extend(options.headers, {
            'Connection': 'keep-alive',
            'Authorization': type1msg
        });
        options.agent = keepaliveAgent;
        request(options, $);
    }

    function requestComplete(res, body, $) {
        if (!res.headers['www-authenticate'])
            return $(new Error('www-authenticate not found on response of second request'));

        var type2msg = ntlm.parseType2Message(res.headers['www-authenticate']);
        var type3msg = ntlm.createType3Message(type2msg, options);
        options.method = method;
        _.extend(options.headers, {
            'Connection': 'keep-alive',
            'Authorization': type3msg,
            'Content-Type': options.contentType //Need to add options to specify this header 
        });

        options.agent = keepaliveAgent;

        if (typeof params == "string")
            options.body = params;
        else
            options.json = params;

        request(options, $);
    }

    async.waterfall([startAuth, requestComplete], callback);
};

exports.get = _.partial(makeRequest, 'get');
exports.post = _.partial(makeRequest, 'post');
exports.put = _.partial(makeRequest, 'put');
exports.delete = _.partial(makeRequest, 'delete');
