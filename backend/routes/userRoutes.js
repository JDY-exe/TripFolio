const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const authenticateToken = require("../middleware/authenticateToken");
const mongoose = require("mongoose");
const Friendship = require("../models/Friendship");
const {
    getFriendRequestError,
    getFriendshipPairKey
} = require("../utils/friendship");

const router = express.Router();

/* One day; 60sec x 60min x 24h */
const JWT_EXPIRES_IN = 60 * 60 * 24;

/**
 * Creates the public user payload returned by authentication endpoints.
 * Selecting fields explicitly prevents password hashes from leaving the server.
 *
 * @param {import("mongoose").Document} user - User document to serialize.
 * @returns {{id: unknown, username: string, email: string, profile_picture: string | undefined, friends: unknown[]}} Safe user data.
 */
function serializeUser(user) {
    return {
        id: user._id,
        username: user.username,
        email: user.email,
        profile_picture: user.profile_picture,
        friends: user.friends
    };
}

/**
 * Signs a one-day access token for a user. The subject identifier is stored in
 * the existing `id` claim consumed by authentication middleware and routes.
 *
 * @param {import("mongoose").Document} user - User receiving the token.
 * @returns {string} Signed JSON Web Token.
 */
function createAccessToken(user) {
    return jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

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

        const token = createAccessToken(user);

        res.status(201).json({
            message: "Account created successfully",
            token,
            user: serializeUser(user)
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
        const token = createAccessToken(user);
        res.status(200).json({
            message: "Login successful",
            token,
            user: serializeUser(user)
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

router.get("/me", authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(401).json({
                message: "Authenticated user no longer exists"
            });
        }

        return res.status(200).json({ user: serializeUser(user) });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
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
                user: serializeUser(user)
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

router.patch("/profile_picture", authenticateToken, async (req, res) => {
    try {
        const { profile_picture } = req.body;

        if (typeof profile_picture !== 'string' || !profile_picture || profile_picture.length > 90000) {
            return res.status(400).json({
                message: "A profile picture under 90 KB is required"
            });
        }
        const user = await User.findById(req.user.id)
        if (!user) {
            return res.status(400).json({
                message: "User not found"
            });
        }
        user.profile_picture = profile_picture;
        await user.save();
        res.status(200).json({
            message: "Profile picture updated successfully",
            user: serializeUser(user)
        });
    }
    catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

router.get("/search", authenticateToken, async (req, res) => {
    try {
        const query = String(req.query.username || "").trim();
        if (!query) {
            return res.status(400).json({ message: "A username search is required" });
        }

        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const users = await User.find({ username: { $regex: escapedQuery, $options: "i" } })
            .select("username profile_picture")
            .limit(20);

        return res.status(200).json({
            users: users.map((user) => ({
                id: user._id,
                username: user.username,
                profile_picture: user.profile_picture
            }))
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
});

router.post("/friends/request", authenticateToken, async (req, res) => {
    try {
        const { targetUserId } = req.body;
        if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
            return res.status(400).json({ message: "A valid target user ID is required" });
        }

        const requester = await User.findById(req.user.id);
        const recipient = await User.findById(targetUserId);
        if (!requester || !recipient) {
            return res.status(404).json({ message: "User not found" });
        }

        const pairKey = getFriendshipPairKey(requester._id, recipient._id);
        const existingFriendship = await Friendship.findOne({ pairKey });
        const requestError = getFriendRequestError({
            requesterId: requester._id,
            recipientId: recipient._id,
            requesterFriends: requester.friends,
            existingFriendship
        });
        if (requestError) {
            return res.status(400).json({ message: requestError });
        }

        const friendship = await Friendship.create({
            requester: requester._id,
            recipient: recipient._id,
            pairKey,
            status: "pending"
        });

        return res.status(201).json({
            message: "Friend request sent",
            request: {
                id: friendship._id,
                status: friendship.status,
                createdAt: friendship.createdAt
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "A friend request already exists" });
        }
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
});

router.get("/friends", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select("friends");
        if (!user) {
            return res.status(401).json({ message: "Authenticated user no longer exists" });
        }

        const [acceptedFriendships, incomingRequests, outgoingRequests] = await Promise.all([
            Friendship.find({
                status: "accepted",
                $or: [{ requester: userId }, { recipient: userId }]
            }).sort({ createdAt: 1 }),
            Friendship.find({ recipient: userId, status: "pending" })
                .sort({ createdAt: 1 })
                .populate({ path: "requester", select: "username profile_picture" }),
            Friendship.find({ requester: userId, status: "pending" })
                .sort({ createdAt: 1 })
                .populate({ path: "recipient", select: "username profile_picture" })
        ]);

        const orderedFriendIds = acceptedFriendships.map((friendship) =>
            String(friendship.requester) === String(userId)
                ? friendship.recipient
                : friendship.requester
        );
        for (const friendId of user.friends) {
            if (!orderedFriendIds.some((id) => String(id) === String(friendId))) {
                orderedFriendIds.push(friendId);
            }
        }

        const friendUsers = await User.find({ _id: { $in: orderedFriendIds } })
            .select("username profile_picture");
        const friendsById = new Map(friendUsers.map((friend) => [String(friend._id), friend]));
        const serializeFriend = (friend) => ({
            id: friend._id,
            username: friend.username,
            profile_picture: friend.profile_picture
        });

        return res.status(200).json({
            friends: orderedFriendIds
                .map((id) => friendsById.get(String(id)))
                .filter(Boolean)
                .map(serializeFriend),
            incomingRequests: incomingRequests
                .filter((request) => request.requester)
                .map((request) => ({
                    id: request._id,
                    createdAt: request.createdAt,
                    user: serializeFriend(request.requester)
                })),
            outgoingRequests: outgoingRequests
                .filter((request) => request.recipient)
                .map((request) => ({
                    id: request._id,
                    createdAt: request.createdAt,
                    user: serializeFriend(request.recipient)
                }))
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
});

router.patch("/friends/accept", authenticateToken, async (req, res) => {
    try {
        const { requestId } = req.body;
        if (!mongoose.Types.ObjectId.isValid(requestId)) {
            return res.status(400).json({ message: "A valid request ID is required" });
        }

        const friendship = await Friendship.findOneAndUpdate(
            { _id: requestId, recipient: req.user.id, status: "pending" },
            { $set: { status: "accepted" } },
            { new: true }
        );
        if (!friendship) {
            return res.status(404).json({ message: "Pending friend request not found" });
        }

        await Promise.all([
            User.findByIdAndUpdate(friendship.requester, {
                $addToSet: { friends: friendship.recipient }
            }),
            User.findByIdAndUpdate(friendship.recipient, {
                $addToSet: { friends: friendship.requester }
            })
        ]);

        return res.status(200).json({
            message: "Friend request accepted",
            friendship: {
                id: friendship._id,
                status: friendship.status
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
