const { getFractionalHours, toUtcIso } = require('../utils/time');

/**
 * Mock collector simulating a realistic solar curve.
 * Sunrise: 06:30, Sunset: 18:30 (Daylight span = 12h)
 * Night: powerKw = 0, status = 'online'
 */
module.exports = {
  name: 'mock',

  async fetch(plant, credentials = null) {
    const timeZone = plant.timezone || 'Asia/Kolkata';
    const now = new Date();
    const hours = getFractionalHours(now, timeZone);
    const capacity = parseFloat(plant.capacity_kw) || 5.0;

    const DAY_START = 6.5; // 06:30
    const DAY_END = 18.5;  // 18:30

    let powerKw = 0.0;
    let todayKwh = 0.0;
    let voltage = 230.0;
    let temperature = 28.0;

    const fullDayKwh = Math.round(capacity * 4.6 * 1000) / 1000;

    if (hours < DAY_START) {
      // Pre-dawn night
      powerKw = 0.0;
      todayKwh = 0.0;
      voltage = 232.0 + (Math.random() * 2 - 1);
      temperature = 24.0 + (Math.random() * 2 - 1);
    } else if (hours > DAY_END) {
      // Post-sunset night
      powerKw = 0.0;
      todayKwh = fullDayKwh;
      voltage = 231.0 + (Math.random() * 2 - 1);
      temperature = 27.0 + (Math.random() * 2 - 1);
    } else {
      // Daytime: bell curve with sine wave
      const progress = (hours - DAY_START) / (DAY_END - DAY_START); // 0.0 to 1.0
      const sineVal = Math.sin(progress * Math.PI);

      // Peak capacity factor ~ 85%
      const peakPower = capacity * 0.85;
      const noise = (Math.random() - 0.5) * 0.06 * peakPower; // +/- 3% noise

      powerKw = Math.max(0, Math.min(capacity, (peakPower * sineVal) + noise));
      powerKw = Math.round(powerKw * 1000) / 1000;

      // Cumulative today energy (integral of sine)
      const dayFactor = (1 - Math.cos(progress * Math.PI)) / 2;
      todayKwh = Math.round(fullDayKwh * dayFactor * 1000) / 1000;

      voltage = Math.round((230.0 + (Math.random() * 6 - 3)) * 10) / 10;
      temperature = Math.round((30.0 + (powerKw / capacity) * 18.0 + (Math.random() * 2 - 1)) * 10) / 10;
    }

    const baselineTotal = 4500.0;
    const totalKwh = Math.round((baselineTotal + todayKwh) * 1000) / 1000;

    return {
      plantId: Number(plant.id),
      time: toUtcIso(now),
      powerKw,
      todayKwh,
      totalKwh,
      voltage: Math.round(voltage * 10) / 10,
      temperature: Math.round(temperature * 10) / 10,
      status: 'online',
      faultCode: null
    };
  }
};
