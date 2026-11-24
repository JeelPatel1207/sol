// Solar Monitor English localization dictionary & formatters
export const strings = {
  appName: 'Solar Monitor',
  loginTitle: 'Welcome Back',
  loginSubtitle: 'Enter credentials to monitor your plants',
  identifierLabel: 'Email or Phone',
  identifierPlaceholder: 'admin@example.com or phone',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Enter your password',
  loginButton: 'Sign In',
  signingIn: 'Signing in...',
  logout: 'Logout',
  navPlants: 'Plants',
  navAlerts: 'Alerts',
  navAdmin: 'Admin',
  powerNow: 'Power Now',
  todayEnergy: 'Today Energy',
  totalEnergy: 'Total Energy',
  todaySavings: 'Today Savings',
  totalSavings: 'Total Savings',
  savings: 'Savings',
  statusOnline: 'Online',
  statusOffline: 'Offline',
  statusFault: 'Fault',
  updatedJustNow: 'Updated just now',
  updatedMinutesAgo: (min) => `Updated ${min}m ago`,
  updatedHoursAgo: (h) => `Updated ${h}h ago`,
  noPlantsFound: 'No plants assigned to your account.',
  pullToRefresh: 'Refresh Data',
  offlineSince: (timeStr) => `Offline since ${timeStr} – showing last data`,
  todayPowerCurve: "Today's Generation Curve",
  voltage: 'Grid Voltage',
  temperature: 'Inverter Temp',
  history: 'History',
  historyComingSoon: 'History screen will be available in Phase 4',
  retry: 'Retry',
  errorLoading: 'Failed to load data. Please retry.'
};

export function formatInr(num) {
  if (num === null || num === undefined || isNaN(num)) return '₹0';
  return '₹' + Number(num).toLocaleString('en-IN', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0
  });
}

export function formatPower(kw) {
  if (kw === null || kw === undefined || isNaN(kw)) return '0.00';
  return Number(kw).toFixed(2);
}

export function formatEnergy(kwh) {
  if (kwh === null || kwh === undefined || isNaN(kwh)) return '0.0';
  return Number(kwh).toFixed(1);
}

export default strings;
