const mockCollector = require('./mock.collector');
const manualCollector = require('./manual.collector');
const vendorCloudCollector = require('./vendorCloud.collector');
const officialApiCollector = require('./officialApi.collector');

const collectors = {
  mock: mockCollector,
  manual: manualCollector,
  vendor_cloud: vendorCloudCollector,
  official_api: officialApiCollector
};

function getCollector(sourceType) {
  return collectors[sourceType] || null;
}

async function fetchPlantReading(plant, credentials = null) {
  const collector = getCollector(plant.source_type);
  if (!collector) {
    throw new Error(`Unsupported source_type: ${plant.source_type} for plant id ${plant.id}`);
  }
  return await collector.fetch(plant, credentials);
}

module.exports = {
  getCollector,
  fetchPlantReading,
  collectors
};
