import fetchMocker from './fetchMockServer.js';

// Helper function to run tests and log results
function runTest(testName, testFunc) {
    try {
        testFunc();
        console.log(`✔️  ${testName} passed`);
    } catch (error) {
        console.error(`❌  ${testName} failed:`, error.message);
    }
}

// Start the mock server before running tests
fetchMocker.start();

// Test 1: Mock a GET request and verify JSON response in default namespace
runTest('Test GET request with JSON response in default namespace', async () => {
    const api = fetchMocker.namespace('api');
    api.get('/users', () => ({
        response: [{ id: 1, name: 'John Doe' }],
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    }));

    const response = await fetch('https://api.com/users');
    const data = await response.json();

    if (response.status !== 200) throw new Error('Status code mismatch');
    if (JSON.stringify(data) !== JSON.stringify([{ id: 1, name: 'John Doe' }])) throw new Error('Response data mismatch');
});

// Test 2: Mock a GET request in a different namespace
runTest('Test GET request with JSON response in "admin" namespace', async () => {
    const admin = fetchMocker.namespace('admin');
    admin.get('/dashboard', () => ({
        response: { admin: true, content: 'Dashboard Data' },
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    }));

    const response = await fetch('https://admin.com/dashboard');
    const data = await response.json();

    if (response.status !== 200) throw new Error('Status code mismatch in admin namespace');
    if (JSON.stringify(data) !== JSON.stringify({ admin: true, content: 'Dashboard Data' })) throw new Error('Response data mismatch in admin namespace');
});

// Test 3: Ensure no cross-namespace contamination
runTest('Test no cross-namespace contamination', async () => {
    // The 'api' namespace has a '/users' route, but 'admin' does not
    try {
        await fetch('https://admin.com/users');
        throw new Error('Expected no match for /users in admin namespace');
    } catch (error) {
        if (!error.message.includes('Expected no match')) throw error; // Correctly failed
    }
});

// Test 4: Mock a POST request and verify response in another namespace
runTest('Test POST request in "blog" namespace', async () => {
    const blog = fetchMocker.namespace('blog');
    blog.post('/articles', () => ({
        response: { id: 101, title: 'New Article' },
        status: 201,
        headers: { 'Content-Type': 'application/json' },
    }));

    const response = await fetch('https://blog.com/articles', { method: 'POST', body: JSON.stringify({ title: 'New Article' }) });
    const data = await response.json();

    if (response.status !== 201) throw new Error('Status code mismatch for POST in blog namespace');
    if (JSON.stringify(data) !== JSON.stringify({ id: 101, title: 'New Article' })) throw new Error('Response data mismatch for POST in blog namespace');
});

// Test 5: Check namespace independence for PUT requests
runTest('Test PUT request independence across namespaces', async () => {
    fetchMocker.restart()
    const api = fetchMocker.namespace('api');
    const admin = fetchMocker.namespace('admin');

    api.put('/settings', () => ({
        response: { success: true },
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    }));

    admin.put('/settings', () => ({
        response: { adminSuccess: true },
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    }));

    const apiResponse = await fetch('https://api.com/settings', { method: 'PUT', body: JSON.stringify({ option: 'A' }) });
    const apiData = await apiResponse.json();
    if (apiResponse.status !== 200 || JSON.stringify(apiData) !== JSON.stringify({ success: true })) {
        throw new Error('Failed PUT request in api namespace');
    }

    const adminResponse = await fetch('https://admin.com/settings', { method: 'PUT', body: JSON.stringify({ option: 'B' }) });
    const adminData = await adminResponse.json();
    console.log(adminData)
    if (adminResponse.status !== 200 || JSON.stringify(adminData) !== JSON.stringify({ adminSuccess: true })) {
        throw new Error('Failed PUT request in admin namespace');
    }
});

// Test 7: Mock a GET request with query parameters
runTest('Test GET request with query parameters', async () => {
    const api = fetchMocker.namespace('api');
    
    // Define the route with query parameter handling
    api.get('/users', ({ queryParams }) => {
        if (queryParams.role === 'admin') {
            return {
                response: [{ id: 1, name: 'Admin User' }],
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            };
        }
        return {
            response: [{ id: 2, name: 'Regular User' }],
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        };
    });

    // Ensure the URL matches expected by mocker (including domain)
    const response = await fetch('https://api.example.com/users?role=admin');
    const data = await response.json();

    if (response.status !== 200) throw new Error('Status code mismatch for query parameters');
    if (JSON.stringify(data) !== JSON.stringify([{ id: 1, name: 'Admin User' }])) throw new Error('Response data mismatch for query parameters');
});
// Test 8: Mock a POST request with JSON body parameters
runTest('Test POST request with JSON body parameters', async () => {
    const api = fetchMocker.namespace('api');
    api.post('/users', ({ bodyParams }) => {
        if (bodyParams.role === 'admin') {
            return {
                response: { success: true, message: 'Admin user created' },
                status: 201,
                headers: { 'Content-Type': 'application/json' },
            };
        }
        return {
            response: { success: true, message: 'Regular user created' },
            status: 201,
            headers: { 'Content-Type': 'application/json' },
        };
    });

    const response = await fetch('https://api.com/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin' }),
    });
    const data = await response.json();

    if (response.status !== 201) throw new Error('Status code mismatch for POST with JSON body');
    if (JSON.stringify(data) !== JSON.stringify({ success: true, message: 'Admin user created' })) throw new Error('Response data mismatch for POST with JSON body');
});

// Test 9: Mock a POST request with form data body parameters
runTest('Test POST request with form data body parameters', async () => {
    const api = fetchMocker.namespace('api');
    api.post('/submit', ({ bodyParams }) => {
        if (bodyParams.name === 'test' && bodyParams.action === 'submit') {
            return {
                response: { success: true, message: 'Form submitted' },
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            };
        }
        return {
            response: { success: false, message: 'Invalid form data' },
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        };
    });

    const response = await fetch('https://api.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'name=test&action=submit',
    });
    const data = await response.json();

    if (response.status !== 200) throw new Error('Status code mismatch for POST with form data');
    if (JSON.stringify(data) !== JSON.stringify({ success: true, message: 'Form submitted' })) throw new Error('Response data mismatch for POST with form data');
});

// Test 10: Mock a POST request with plain text body
runTest('Test POST request with plain text body', async () => {
    const api = fetchMocker.namespace('api');
    api.post('/text', ({ bodyParams }) => {
        if (bodyParams.text === 'Hello, World!') {
            return {
                response: { success: true, message: 'Text received' },
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            };
        }
        return {
            response: { success: false, message: 'Text not received' },
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        };
    });

    const response = await fetch('https://api.com/text', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'Hello, World!',
    });
    const data = await response.json();

    if (response.status !== 200) throw new Error('Status code mismatch for POST with plain text');
    if (JSON.stringify(data) !== JSON.stringify({ success: true, message: 'Text received' })) throw new Error('Response data mismatch for POST with plain text');
});


// Test: Mock a GET request with parameterized path
runTest('Test GET request with parameterized path', async () => {
    const api = fetchMocker.namespace('api');

    // Add a route with a parameterized path
    api.get('/users/:id', ({ params }) => ({
        response: { id: params.id, name: `User ${params.id}` },
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    }));

    // Testing with a matching path
    const response = await fetch('https://api.example.com/users/123');
    const data = await response.json();

    if (response.status !== 200) throw new Error('Status code mismatch for parameterized path');
    if (JSON.stringify(data) !== JSON.stringify({ id: '123', name: 'User 123' })) throw new Error('Response data mismatch for parameterized path');

    // Testing with another matching path
    const response2 = await fetch('https://api.example.com/users/456');
    const data2 = await response2.json();

    if (response2.status !== 200) throw new Error('Status code mismatch for another parameterized path');
    if (JSON.stringify(data2) !== JSON.stringify({ id: '456', name: 'User 456' })) throw new Error('Response data mismatch for another parameterized path');
});


// Test: Mock a POST request with query params, body params, and path params
runTest('Test POST request with query params, body params, and path params', async () => {
    const api = fetchMocker.namespace('api');

    // Add a route with parameterized path, query parameters, and body parameters
    api.post('/users/:id/update', ({ params, queryParams, bodyParams }) => {
        // Check expected values from params, queryParams, and bodyParams
        if (params.id !== '123') throw new Error('Path parameter mismatch');
        if (queryParams.action !== 'edit') throw new Error('Query parameter mismatch');
        if (bodyParams.name !== 'John Doe' || bodyParams.email !== 'john@example.com') {
            throw new Error('Body parameter mismatch');
        }

        return {
            response: {
                id: params.id,
                action: queryParams.action,
                updatedUser: bodyParams,
            },
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        };
    });

    // Send a request that includes all types of parameters
    const response = await fetch('https://api.example.com/users/123/update?action=edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'John Doe', email: 'john@example.com' }),
    });
    const data = await response.json();

    // Validate response status and data
    if (response.status !== 200) throw new Error('Status code mismatch for POST request with all params');
    if (JSON.stringify(data) !== JSON.stringify({
        id: '123',
        action: 'edit',
        updatedUser: { name: 'John Doe', email: 'john@example.com' },
    })) throw new Error('Response data mismatch for POST request with all params');
});


console.log('All tests completed.');
