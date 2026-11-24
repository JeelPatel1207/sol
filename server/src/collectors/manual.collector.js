/**
 * Manual collector.
 * Manual plants rely on admin entry via form, not automated 5-minute polling.
 * Returning null signals the scheduler to skip polling for manual plants.
 */
module.exports = {
  name: 'manual',

  async fetch(plant, credentials = null) {
    return null;
  }
};
