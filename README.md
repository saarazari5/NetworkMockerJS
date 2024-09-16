# FetchMocker

FetchMocker is a JavaScript utility that allows you to easily mock network requests made with the Fetch API in your applications. It is designed to provide a simple yet powerful way to intercept, log, and handle HTTP requests with custom responses, making it ideal for testing and development environments.

## Features

- **Start and Stop the Mock Server**: Easily start, stop, or restart the mock server to intercept Fetch API requests.
- **Namespace Support**: Organize mocks into namespaces, allowing different sets of routes to be grouped logically.
- **Route Management**: Define custom routes for `GET`, `POST`, `PUT`, and `DELETE` requests within namespaces.
- **Request Logging**: Track all fetch calls made, including their URLs, methods, and options.
- **Response Handling**: Provide custom handlers for routes to return dynamic responses based on query parameters, body content, and path variables.
- **Error Handling**: Log errors gracefully when handlers fail to execute properly.
- **Fetch Override**: Seamlessly override the global `fetch` function to intercept and manage requests.
- **Reset Functionality**: Reset all mocks and restore the original `fetch` function.

## Getting Started

### Installation

Clone the repository and include `fetchMockServer.js` in your project:

```bash
git clone [<repository-url>](https://github.com/saarazari5/NetworkMockerJS)
```
### Usage

1. **Import FetchMocker**:

    ```javascript
    import fetchMocker from './fetchMockServer.js';
    ```

2. **Start the Mock Server**:

    ```javascript
    fetchMocker.start();
    ```

3. **Define Routes**:

    Add routes within namespaces to handle specific requests:

    ```javascript
    fetchMocker.namespace('exampleNamespace').get('/api/data', (params) => {
        return {
            response: { message: 'Hello, World!' },
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        };
    });
    ```

4. **Stop the Mock Server**:

    ```javascript
    fetchMocker.stop();
    ```

5. **Restart the Mock Server**:

    ```javascript
    fetchMocker.restart();
    ```

6. **Reset Mock Server**:

    Reset all mocks and return to the original `fetch` functionality:

    ```javascript
    fetchMocker.reset();
    ```

### Example

Here's a quick example demonstrating how to use FetchMocker:

```javascript
import fetchMocker from './fetchMockServer.js';

// Start the server
fetchMocker.start();

// Add a GET route
fetchMocker.namespace('myApi').get('/users', (params) => {
    return {
        response: [{ id: 1, name: 'John Doe' }],
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    };
});

// Perform a fetch request (this will be intercepted by FetchMocker)
fetch('https://myApi/users')
    .then(response => response.json())
    .then(data => console.log(data)); // Outputs: [{ id: 1, name: 'John Doe' }]

// Stop the server when done
fetchMocker.stop();
```
