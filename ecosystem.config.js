module.exports = {
	apps: [{
		name: 'suroi',
		script: './index.js',

		// Configuration options
		exec_mode: 'fork',

		// Monitoring changes in files and restarting the application
		watch: false,
		ignore_watch: ['.git', 'node_modules', 'logs', '.eslintrc.js', 'ecosystem.config.js'],

		// Logging settings
		log_date_format: 'HH:mm:ss.SSS DD.MM.YYYY',
		merge_logs: true,
		log_file: '/home/root/logs/www/suroi.sefinek.net/combined.log',
		out_file: '/home/root/logs/www/suroi.sefinek.net/out.log',
		error_file: '/home/root/logs/www/suroi.sefinek.net/error.log',

		// Application restart policy
		autorestart: true,
		max_restarts: 5,
		restart_delay: 4000,
		min_uptime: 13000,

		// Environment variables
		env: {
			NODE_ENV: 'production'
		}
	}]
};