const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");

const router = express.Router();

router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Username, email, and password are required"
            });
        }
        const existingUsername = await User.findOne({ username });

        if (existingUsername) {
            return res.status(409).json({
                message: "Username already exists"
            });
        }

        // Check if email already exists
        const existingEmail = await User.findOne({ email });

        if (existingEmail) {
            return res.status(409).json({
                message: "Email already exists"
            });
        }

        // Hash and salt the password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            friends: []
        });

        res.status(201).json({
            message: "Account created successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                profile_picture: user.profile_picture,
                friends: user.friends
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Compare the entered password with the stored bcrypt hash
        const passwordMatches = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Login successful
        res.status(200).json({
            message: "Login successful"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

router.get("/", async (req, res) => {
    try {
        const { email, username } = req.query;
        if (!email && !username) {
            return res.status(400).json({
                message: "Email or username is required"
            });
        }
        let user = null;
        if (email) {
            user = await User.findOne({ email });
        }
        if (username) {
            user = await User.findOne({ username })
        }
        if (user) {
            res.status(200).json({
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    profile_picture: user.profile_picture,
                    friends: user.friends
                }
            });
        }
        else {
            res.status(404).json({
                message: "User not found"
            })
        }
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
})

module.exports = router;