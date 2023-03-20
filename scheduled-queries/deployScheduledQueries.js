'use strict';
//From docs
//Use the projects.locations.transferConfigs.create method and supply an instance of the TransferConfig resource.
// build trigger comment. v3
const bigqueryDataTransfer = require('@google-cloud/bigquery-data-transfer');
const R = require('ramda');
const fs = require('fs');
const path = require("path");

let projectId = 'test'

const getExistingTransfers = (client) => {
  return client.getProjectId()
    .then((id) => {
      projectId = id
      const formattedParent = client.projectPath(projectId);
      const request = {parent: formattedParent};
      const options = {autoPaginate: false};
      return client.listTransferConfigs(request, options);
    })
}

const updateTransfer = (client) => (transferConfig) => {
  const request = {
    transferConfig: transferConfig,
    updateMask: {
      "paths": [
        "params",
        "disabled",
        "schedule"
      ]
    }
  };
  const options = {autoPaginate: false};
  return client.updateTransferConfig(request, options)
}

const createTransfer = (client) => (transferConfig) => {
  const formattedParent = client.projectPath(projectId);
  const request = {
    parent: formattedParent,
    transferConfig: transferConfig,
  };
  const options = {autoPaginate: false};
  return client.createTransferConfig(request, options)
}

// const extractTransferConfigName = (configDisplayName) => (configList) => {
//   const extractTransferDisplayName = R.propEq('displayName', configDisplayName)
//   return R.prop('name', R.find(extractTransferDisplayName, configList))
// }

const extractTransferConfig = (configNameList) => (configObj) => {
  return R.anyPass(R.map(R.propEq('displayName'), configNameList))(configObj)
  //return R.find(extractTransferDisplayName, configObj)
}

const buildTransferConfig = (queryConfigMap) => (queryName) => {
  const configBase = fs.readFileSync(`./scheduled-queries/configs/${queryName}.json`);
  const query = fs.readFileSync(`./scheduled-queries/sql/${queryName}.sql`)
  const config = R.assocPath(["params", "fields", "query"],
    {"stringValue": query.toString()}, JSON.parse(configBase));
  return R.assoc("name", R.pathOr(null, [queryName, "name"], queryConfigMap), config)
}

//If we have a config file for it, we will attempt to deploy it
const configDir = `./scheduled-queries/configs`
const extractFilename = (file) => path.parse(file).name
const queryUpdateList = R.map(extractFilename, fs.readdirSync(configDir))
//const queryUpdateList = ['trips_by_week', 'process_bookings_wheelbase']

const configureTransfers = (client, queryList) => {
  console.log(`query list ${queryList}`)
  return getExistingTransfers(client)
    .then(R.head)//gets the resources, loses the rest
    .then(R.filter(extractTransferConfig(queryList))) //Get a list of existing transfers that match to our config list
    .then(R.indexBy(R.prop('displayName'))) //Convert to object for easy referencing
    .then((configMap) => {
      return R.map(buildTransferConfig(configMap), queryList) //Build config objects for all items in list
    })
    .then(R.map(R.ifElse(R.propEq("name", null), createTransfer(client), updateTransfer(client))))
    .then(Promise.all.bind(Promise))

}

const updateScheduledQueries = (keyfile) => {
  const opts = {
    keyFile: keyfile,
  }
  const client = new bigqueryDataTransfer.v1.DataTransferServiceClient(opts);
  return configureTransfers(client, queryUpdateList)
}

const creds = process.argv.slice(2).pop();

updateScheduledQueries(creds)


