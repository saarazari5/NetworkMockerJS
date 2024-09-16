class FetchMocker {
    constructor() {
        this.originalFetch = global.fetch.bind(global); // Save the original fetch function
        this.namespaces = {}; // Map to hold mocks by namespaces
        this.calls = []; // Array to store information about fetch calls made
        this.isServerRunning = false; // Track server state
        this.logger = this.createLogger(); // Logger for detailed output
    }

    createLogger() {
        return {
            log: (message) => console.log(`[FetchMocker] ${message}`),
            warn: (message) => console.warn(`[FetchMocker] ${message}`),
            error: (message) => console.error(`[FetchMocker] ${message}`)
        };
    }

    start() {
        if (this.isServerRunning) {
            this.logger.warn('Mock server is already running.');
            return;
        }
        this.overrideFetch(); // Override fetch to start mock server
        this.isServerRunning = true;
        this.logger.log('Mock server started.');
    }

    stop() {
        this.reset();
        this.logger.log('Mock server stopped.');
    }

    restart() {
        this.stop();
        this.start();
        this.logger.log('Mock server restarted.');
    }

    namespace(name) {
        if (!this.namespaces[name]) {
            this.namespaces[name] = new Map(); // Use Map for efficient lookups
            this.logger.log(`Namespace "${name}" created.`);
        }
        return {
            get: (path, handler, options) => this.addRoute(name, 'GET', path, handler, options),
            post: (path, handler, options) => this.addRoute(name, 'POST', path, handler, options),
            put: (path, handler, options) => this.addRoute(name, 'PUT', path, handler, options),
            delete: (path, handler, options) => this.addRoute(name, 'DELETE', path, handler, options),
        };
    }

    overrideFetch() {
        global.fetch = async (input, init = {}) => {
            const url = typeof input === 'string' ? input : input.url;
            const method = (init.method || 'GET').toUpperCase();

            this.calls.push({ url, method, options: init }); // Log the fetch call
            this.logger.log(`Fetch called: ${method} ${url}`);

            const response = await this.routeRequest(url, method, init);
            if (response) return response;

            this.logger.warn(`No route found for ${method} ${url}. Returning 404.`);
            return new Response('Not Found', { status: 404 });
        };
    }

    addRoute(namespace, method, path, handler, options = {}) {
        const routeKey = `${method} ${path}`;
        if (this.namespaces[namespace].has(routeKey)) {
            this.logger.warn(`Route already exists for ${method} ${path} in namespace ${namespace}.`);
            return;
        }
        this.namespaces[namespace].set(routeKey, { handler, ...options });
        this.logger.log(`Route added: [${method}] ${namespace}/${path}`);
    }
    
    async routeRequest(url, method, init) {
        const urlObj = new URL(url);
        const queryParams = Object.fromEntries(urlObj.searchParams.entries());
        let bodyParams = {};
    
        if (init.body && (method === 'POST' || method === 'PUT')) {
            const contentType = init.headers?.['Content-Type']?.toLowerCase() || init.headers?.['content-type']?.toLowerCase();
            if (contentType) {
                try {
                    if (contentType.includes('application/json')) {
                        bodyParams = JSON.parse(init.body);
                    } else if (contentType.includes('application/x-www-form-urlencoded')) {
                        bodyParams = Object.fromEntries(new URLSearchParams(init.body));
                    } else if (contentType.includes('text/plain')) {
                        bodyParams = { text: init.body };
                    }
                } catch (e) {
                    this.logger.error(`Error parsing body: ${e.message}`);
                }
            }
        }
    
        for (const [namespace, routes] of Object.entries(this.namespaces)) {
            // Match namespace with the hostname
            if (urlObj.hostname.includes(namespace)) {
                for (const [routeKey, route] of routes) {
                    const [routeMethod, routePath] = routeKey.split(' ');
                    const { handler, queryParams: expectedQueryParams, bodyParams: expectedBodyParams } = route;
    
                    const match = this.matchPath(urlObj.pathname, routePath);
                    if (routeMethod === method && match) {
                        const { params } = match;
                        if (this.matchParams(queryParams, expectedQueryParams) && this.matchParams(bodyParams, expectedBodyParams)) {
                            this.logger.log(`Route matched: ${namespace}/${routePath}`);
                            return this.executeHandler(handler, { queryParams, bodyParams, params });
                        }
                    }
                }
            }
        }
        return null;
    }

    async executeHandler(handler, params) {
        try {
            const result = await handler(params);
            const { response, status = 200, headers = {} } = result;
            const contentType = headers['Content-Type'] || headers['content-type'];
            const body = contentType && contentType.includes('application/json')
                ? JSON.stringify(response)
                : response;

            this.logger.log(`Handler executed successfully with status ${status}.`);
            return new Response(body, {
                status,
                headers: new Headers(headers),
            });
        } catch (error) {
            this.logger.error(`Error executing handler: ${error.message}`);
            return new Response('Server Error', { status: 500 });
        }
    }

    matchPath(urlPath, routePath) {
        const paramNames = [];
        // Convert routePath to regex by replacing :param with capturing groups
        const regexPath = routePath.replace(/:([^/]+)/g, (_, key) => {
            paramNames.push(key);
            return '([^/]+)';
        });
        const regex = new RegExp(`^${regexPath}$`);
        const match = urlPath.match(regex);

        if (!match) return false;

        // Extract parameter values into an object
        const params = paramNames.reduce((acc, name, index) => {
            acc[name] = match[index + 1];
            return acc;
        }, {});

        return { params };
    }

    matchParams(params, expectedParams) {
        if (!expectedParams) return true; // No specific params expected, always match
        return Object.entries(expectedParams).every(([key, value]) => params[key] === value);
    }

    getCalls(url = null) {
        return url ? this.calls.filter(call => call.url === url) : this.calls;
    }

    reset() {
        this.namespaces = {};
        this.calls = [];
        global.fetch = this.originalFetch; // Properly reset fetch
        this.isServerRunning = false;
        this.logger.log('Mock server reset.');
    }
}

const fetchMocker = new FetchMocker();
export default fetchMocker;
