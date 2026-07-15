const { src, dest, parallel } = require('gulp');

// Copy node & credential icons (svg/png) into dist so n8n can serve them.
// NOTE: `encoding: false` is required on gulp 5 / vinyl-fs 4, otherwise binary
// files (PNG) are re-encoded as UTF-8 and corrupted (every byte >= 0x80 becomes
// the U+FFFD replacement char). Without it the served PNG is unreadable.
function nodeIcons() {
	return src('nodes/**/*.{png,svg}', { encoding: false }).pipe(dest('dist/nodes'));
}

function credentialIcons() {
	return src('credentials/**/*.{png,svg}', { allowEmpty: true, encoding: false }).pipe(
		dest('dist/credentials'),
	);
}

exports['build:icons'] = parallel(nodeIcons, credentialIcons);
