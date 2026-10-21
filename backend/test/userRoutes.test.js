const assert = require("node:assert/strict");
const test = require("node:test");
let authToken;

const BASE_URL = "http://localhost:5000";

const testUsername = `testuser_${Date.now()}`;
const testEmail = `test_${Date.now()}@example.com`;
const testPassword = "password123";

test("POST /users/register creates a new user", async () => {
  const response = await fetch(`${BASE_URL}/users/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username: testUsername,
      email: testEmail,
      password: testPassword
    })
  });

  const data = await response.json();

  assert.equal(response.status, 201);
  assert.equal(data.message, "Account created successfully");
  assert.equal(data.user.username, testUsername);
  assert.equal(data.user.email, testEmail);
});

test("POST /users/register rejects missing username, email, or password", async () => {
  const response = await fetch(`${BASE_URL}/users/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username: testUsername,
      email: testEmail
    })
  });

  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(
    data.message,
    "Username, email, and password are required"
  );
});

test("POST /users/register rejects an existing username", async () => {
  const response = await fetch(`${BASE_URL}/users/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username: testUsername,
      email: `different_${Date.now()}@example.com`,
      password: testPassword
    })
  });

  const data = await response.json();

  assert.equal(response.status, 409);
  assert.equal(data.message, "Username already exists");
});

test("POST /users/register rejects an existing email", async () => {
  const response = await fetch(`${BASE_URL}/users/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username: `differentuser_${Date.now()}`,
      email: testEmail,
      password: testPassword
    })
  });

  const data = await response.json();

  assert.equal(response.status, 409);
  assert.equal(data.message, "Email already exists");
});

test("POST /users/login successfully logs in a user", async () => {
  const response = await fetch(`${BASE_URL}/users/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword
    })
  });

  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.message, "Login successful");
  assert.ok(data.token);
  authToken = data.token;
  assert.equal(data.user.username, testUsername);
  assert.equal(data.user.email, testEmail);
});

test("POST /users/login rejects missing email or password", async () => {
  const response = await fetch(`${BASE_URL}/users/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: testEmail
    })
  });

  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(
    data.message,
    "Email and password are required"
  );
});

test("POST /users/login rejects an invalid email or password", async () => {
  const response = await fetch(`${BASE_URL}/users/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: "doesnotexist@example.com",
      password: "wrongpassword"
    })
  });

  const data = await response.json();

  assert.equal(response.status, 401);
  assert.equal(
    data.message,
    "Invalid email or password"
  );
});

test("GET /users finds a user by email", async () => {
  const response = await fetch(
    `${BASE_URL}/users?email=${encodeURIComponent(testEmail)}`
  );

  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.user.username, testUsername);
  assert.equal(data.user.email, testEmail);
});

test("GET /users finds a user by username", async () => {
  const response = await fetch(
    `${BASE_URL}/users?username=${encodeURIComponent(testUsername)}`
  );

  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.user.username, testUsername);
  assert.equal(data.user.email, testEmail);
});

test("GET /users rejects a request without email or username", async () => {
  const response = await fetch(`${BASE_URL}/users`);

  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(
    data.message,
    "Email or username is required"
  );
});

test("GET /users returns 404 when the user does not exist", async () => {
  const response = await fetch(
    `${BASE_URL}/users?email=doesnotexist@example.com`
  );

  const data = await response.json();

  assert.equal(response.status, 404);
  assert.equal(data.message, "User not found");
});

test("PATCH /users/profile_picture rejects a missing profile picture", async () => {
  const response = await fetch(
    `${BASE_URL}/users/profile_picture`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({})
    }
  );

  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(
    data.message,
    "A profile picture under 90 KB is required"
  );
});

test("PATCH /users/profile_picture rejects an empty profile picture", async () => {
  const response = await fetch(
    `${BASE_URL}/users/profile_picture`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        profile_picture: ""
      })
    }
  );

  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(
    data.message,
    "A profile picture under 90 KB is required"
  );
});

test("PATCH /users/profile_picture rejects an invalid token", async () => {
  const response = await fetch(
    `${BASE_URL}/users/profile_picture`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid-token"
      },
      body: JSON.stringify({
        profile_picture: "https://example.com/profile.jpg"
      })
    }
  );

  const data = await response.json();

  assert.equal(response.status, 401);
  assert.equal(
    data.message,
    "Invalid or expired token"
  );
});