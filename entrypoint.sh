#!/bin/sh

# Generate env.js dynamically from ENV variable
cat <<EOF > /usr/share/nginx/html/assets/env.js
window.env = {
  apiUrl: "${API_URL}"
};
EOF

# Start nginx
nginx -g "daemon off;"
