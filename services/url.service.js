"use strict";

// all required modules
const DBService = require('moleculer-db');
const { ServiceBroker } = require("moleculer");
const MongoDBAdapter = require("moleculer-db-adapter-mongo");
const broker = new ServiceBroker();
const request = require('request');

// Create a Mongoose service for `post` entities

// const connection_url = "mongodb://localhost/dyte_backend"
// admin:aroiyuHQpRReBHdE
const connection_url = "mongodb+srv://admin:aroiyuHQpRReBHdE@cluster0.eswx0.mongodb.net/dyte_backend?retryWrites=true&w=majority"
broker.createService({
    name: "urls",
    mixins: [DBService],
    adapter: new MongoDBAdapter(connection_url),
	settings: {
        fields: ["_id", "targetURL"],
        entityValidator: {
			targetURL: "string"
		}
    },
    collection: "urls",
});


broker.start()

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */

module.exports = {
	name: "url",
	settings: {},
	dependencies: [],
	actions: {
		//register
		register: {
            params: {
                targetURL: 'string'
            },
			rest: {
				method: "POST",
				path: "/register"
			},
			async handler(ctx) {
				const { targetURL } = ctx.params;

                const add = await broker.call("urls.create", {
					targetURL: targetURL
				});

				return ("Your unique ID is: " + add._id);
			}
		},

		// get whole list of target urls with ids        
		list: {
			rest: {
				method: "GET",
				path: "/list"
			},
			async handler() {
                const url_list = await broker.call("urls.find");
				return url_list;
			}
		},

		// update targetUrl
		update: {
            params: {
				id: 'string',
                targetURL: 'string'
            },
			rest: {
				method: "POST",
				path: "/update"
			},
			async handler(ctx) {
				const { id, targetURL } = ctx.params;

                const add = await broker.call("urls.update", {
					_id: id,
					targetURL: targetURL
				});

				return ("Sucessfully updated the URL.");
			}
		},

		// delete a particular id        
		delete: {
			params: {
				id: 'string'
            },
			rest: {
				method: "POST",
				path: "/delete"
			},
			async handler(ctx) {
				const { id } = ctx.params

                const url_list = await broker.call("urls.remove", { id: id });

				return ("Deleted sucessfully.");
			}
		},

		// trigger for ip       
		ip: {
			rest: {
				method: "GET",
				path: "/ip"
			},
			async handler(ctx) {
				const docker = "parentCtx" in ctx.options;

				//console.log(docker);

				if(docker){
					var ip = ctx.options.parentCtx.params.req.headers['x-forwarded-for'];
				}else{
					var ip = "IP address could not be found if you are using docker as there are no request headers."
				}
				
				if(ip == undefined){
					var ip = "192.168.1.1 (IP address could not be found in the header. Please use ngrok or deploy.)";
				}

                const url_list = await broker.call("urls.find");

				const no_urls = url_list.length;

				const batch_size = 10;

				const batch = Math.ceil(no_urls/batch_size);

				const rem = no_urls%batch_size;

				//console.log("no_urls: ", no_urls, "; batch_size: ", batch_size);
				//console.log("batch: ", batch, "; rem: ", rem);
				
				for(var i=0; i<batch; i++){
					if(i == batch-1){
						var inner_size = rem;
					}else{
						var inner_size = batch_size;
					}

					const unix_timestamp = (new Date()).getTime();

					for(var j=0; j<inner_size; j++){
						var ind = i*batch_size + j;
						//console.log("i: ", i, "; j: ", j, "; ind: ", ind);
						request({
							url: url_list[ind].targetURL,
							method: "POST",
							json: true,
							body: { ip_address: ip, unix_timestamp: unix_timestamp }
						}, function (error, response, body) {
							// code to retry if response is not received
							if(!response){
								var retry = 0;
								var status_code = false;
								const max_retries = 5;
								while (retry<max_retries && status_code==false){
									//console.log("Retrying attempt: ", retry+1);
									request({
										url: url_list[ind].targetURL,
										method: "POST",
										json: true,
										body: { ip_address: ip, unix_timestamp: unix_timestamp }
									}, function (error, response, body) {
										if(response && response.statusCode == 200){
											status_code = true;
										}
										retry++;
									});
								}
							}
						});
					}
				}

				return ("Successfully triggered for IP address: " + ip);
			}
		}

	},
	events: {

	},
	methods: {

	},
	created() {

	},
	async started() {

	},
	async stopped() {

	}
};
