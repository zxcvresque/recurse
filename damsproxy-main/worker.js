// worker.js

// --- API Configuration ---
const API_BASE = "https://api.damsdelhi.com/v2_data_model";

// --- The single source of truth for the initial build number ---
const INITIAL_BUILD_NO = 525;
const BUILD_ENDPOINT = `${API_BASE}/courses/Home/get_homescreen_categorydata`;

// --- KV Optimization Configuration ---
const CACHE_TTL = 300; // 5 minutes cache
const BATCH_SIZE = 10; // Process in batches of 10
const MAX_CONCURRENT_REQUESTS = 5; // Limit concurrent operations

// --- New Function: Checks for the latest build number ---
async function findAndStoreLatestBuild(env) {
    console.log("Starting build number check...");

    const startBuildNo = INITIAL_BUILD_NO;
    const checkLimit = 50;

    const promises = [];
    for (let i = 0; i < checkLimit; i++) {
        const currentBuildNo = startBuildNo + i;

        const apiHeaders = {
            accept: "application/json",
            authorization: env.AUTH_TOKEN,
            device_tokken: env.DEVICE_TOKEN,
            user_id: "303043",
            device_type: "1",
            build_no: currentBuildNo.toString(),
            api_version: "10",
            stream_id: "1",
            "content-type": "application/x-www-form-urlencoded",
            "user-agent": "okhttp/4.12.0",
        };

        const body = new URLSearchParams({ user_id: "303043", stream_id: "1" });

        promises.push(
            fetch(BUILD_ENDPOINT, {
                method: "POST",
                headers: apiHeaders,
                body,
            }).then(response => {
                return response.json().then(data => ({ data, response, buildNo: currentBuildNo }));
            }).catch(e => {
                return { error: e, response: null, buildNo: currentBuildNo };
            })
        );
    }

    const allResponses = await Promise.all(promises);

    // First, identify which builds are definitely non-working
    const nonWorkingBuilds = new Set();
    const workingBuilds = [];

    for (const { data, response, buildNo } of allResponses) {
        // Check if this is a definite non-working build
        if (response && !response.ok) {
            nonWorkingBuilds.add(buildNo);
        } else if (response && response.ok && data?.status === true) {
            workingBuilds.push(buildNo);
        }
    }

    console.log(`Found ${nonWorkingBuilds.size} non-working builds, ${workingBuilds.length} working builds`);

    // Find the highest sequential working build (after any non-working ones)
    let selectedBuild = null;
    for (let i = 0; i < checkLimit; i++) {
        const currentBuildNo = startBuildNo + i;
        if (workingBuilds.includes(currentBuildNo)) {
            // Check if all previous builds were non-working
            const hasAnyWorkingBefore = workingBuilds.some(wb => wb < currentBuildNo);
            if (!hasAnyWorkingBefore || nonWorkingBuilds.has(currentBuildNo - 1)) {
                selectedBuild = currentBuildNo;
                break;
            }
        }
    }

    // If no sequential pattern found, use the highest working build
    if (!selectedBuild && workingBuilds.length > 0) {
        selectedBuild = Math.max(...workingBuilds);
    }

    if (selectedBuild) {
        await env.DAMS_KV.put("current_build_no", selectedBuild.toString());
        console.log(`Successfully found and stored working build number: ${selectedBuild}`);
        return { success: true, message: `Build number updated to ${selectedBuild}.` };
    } else {
        const errorMessage = "Could not find a working build number within the search range.";
        console.error(errorMessage);
        return { success: false, message: errorMessage };
    }
}

// --- Optimized KV Cache Manager ---
class KVCacheManager {
    constructor(env) {
        this.env = env;
        this.cache = new Map();
        this.pendingWrites = new Map();
    }

    // Get cached value with TTL
    async get(key, ttl = CACHE_TTL) {
        const cacheKey = `cache:${key}`;
        const cached = this.cache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp) < (ttl * 1000)) {
            return cached.value;
        }

        try {
            const value = await this.env.DAMS_KV.get(key);
            if (value) {
                this.cache.set(cacheKey, {
                    value: JSON.parse(value),
                    timestamp: Date.now()
                });
                return JSON.parse(value);
            }
        } catch (error) {
            console.error(`KV get error for ${key}:`, error);
        }
        return null;
    }

    // Set value with optional cache
    async set(key, value, cache = true) {
        try {
            await this.env.DAMS_KV.put(key, JSON.stringify(value));

            if (cache) {
                const cacheKey = `cache:${key}`;
                this.cache.set(cacheKey, {
                    value: value,
                    timestamp: Date.now()
                });
            }
            return true;
        } catch (error) {
            console.error(`KV set error for ${key}:`, error);
            return false;
        }
    }

    // Batch get multiple keys
    async batchGet(keys) {
        const results = new Map();
        const uncachedKeys = [];

        // Check cache first
        for (const key of keys) {
            const cacheKey = `cache:${key}`;
            const cached = this.cache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < (CACHE_TTL * 1000)) {
                results.set(key, cached.value);
            } else {
                uncachedKeys.push(key);
            }
        }

        // Batch fetch uncached keys
        if (uncachedKeys.length > 0) {
            const batches = [];
            for (let i = 0; i < uncachedKeys.length; i += BATCH_SIZE) {
                batches.push(uncachedKeys.slice(i, i + BATCH_SIZE));
            }

            for (const batch of batches) {
                const promises = batch.map(async (key) => {
                    try {
                        const value = await this.env.DAMS_KV.get(key);
                        if (value) {
                            const parsedValue = JSON.parse(value);
                            results.set(key, parsedValue);

                            // Update cache
                            const cacheKey = `cache:${key}`;
                            this.cache.set(cacheKey, {
                                value: parsedValue,
                                timestamp: Date.now()
                            });
                        }
                    } catch (error) {
                        console.error(`Batch get error for ${key}:`, error);
                    }
                });

                await Promise.allSettled(promises);
            }
        }

        return results;
    }

    // Batch set multiple key-value pairs
    async batchSet(items) {
        const batches = [];
        for (let i = 0; i < items.length; i += BATCH_SIZE) {
            batches.push(items.slice(i, i + BATCH_SIZE));
        }

        for (const batch of batches) {
            const promises = batch.map(async ({ key, value }) => {
                try {
                    await this.env.DAMS_KV.put(key, JSON.stringify(value));

                    // Update cache
                    const cacheKey = `cache:${key}`;
                    this.cache.set(cacheKey, {
                        value: value,
                        timestamp: Date.now()
                    });
                } catch (error) {
                    console.error(`Batch set error for ${key}:`, error);
                }
            });

            await Promise.allSettled(promises);
        }
    }

    // Get aggregated data with caching
    async getAggregatedData(type) {
        const cacheKey = `aggregated:${type}`;
        return await this.get(cacheKey, 60); // 1 minute cache for aggregated data
    }

    // Set aggregated data
    async setAggregatedData(type, data) {
        const cacheKey = `aggregated:${type}`;
        return await this.set(cacheKey, data, true);
    }

    // Clean expired cache entries
    cleanExpiredCache() {
        const now = Date.now();
        const expiredKeys = [];

        for (const [key, cached] of this.cache.entries()) {
            if ((now - cached.timestamp) > (CACHE_TTL * 1000)) {
                expiredKeys.push(key);
            }
        }

        for (const key of expiredKeys) {
            this.cache.delete(key);
        }
    }
}

// --- Optimized Helper for making the API call ---
async function fetchFromApi(apiUrl, body, env, cacheManager = null) {
    // Check cache first for API responses
    if (cacheManager) {
        const cacheKey = `api:${apiUrl}:${body}`;
        const cached = await cacheManager.get(cacheKey, 600); // 10 minutes cache for API calls
        if (cached) {
            return cached;
        }
    }

    // Always use INITIAL_BUILD_NO to avoid cached values
    const buildNoToUse = INITIAL_BUILD_NO.toString();

    const apiHeaders = {
        accept: "application/json",
        authorization: env.AUTH_TOKEN,
        device_tokken: env.DEVICE_TOKEN,
        user_id: "303043",
        device_type: "1",
        build_no: buildNoToUse,
        api_version: "10",
        stream_id: "1",
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": "okhttp/4.12.0",
    };

    const response = await fetch(apiUrl, {
        method: "POST",
        headers: apiHeaders,
        body,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Cache the response if cache manager is available
    if (cacheManager) {
        const cacheKey = `api:${apiUrl}:${body}`;
        await cacheManager.set(cacheKey, data, true);
    }

    return data;
}

// --- Optimized API Handlers with Caching ---

async function handleCategories(url, env) {
    const cacheManager = new KVCacheManager(env);
    const cacheKey = `categories:all`;

    // Try cache first
    const cachedData = await cacheManager.get(cacheKey, 600); // 10 minutes cache
    if (cachedData) {
        return cachedData;
    }

    const apiUrl = `${API_BASE}/courses/Home/get_homescreen_categorydata`;
    const body = new URLSearchParams({ user_id: "303043", stream_id: "1" });
    const responseData = await fetchFromApi(apiUrl, body, env, cacheManager);

    const data = responseData?.data || [];
    await cacheManager.set(cacheKey, data);
    return data;
}

async function handleCourses(url, env) {
    const categoryId = url.searchParams.get("category_id");
    const cacheManager = new KVCacheManager(env);
    const cacheKey = `courses:${categoryId}`;

    // Try cache first
    const cachedData = await cacheManager.get(cacheKey, 600); // 10 minutes cache
    if (cachedData) {
        return cachedData;
    }

    const apiUrl = `${API_BASE}/courses/Home/GetHomeScreenTab`;
    const body = new URLSearchParams({ user_id: "303043", cat_id: categoryId });
    const responseData = await fetchFromApi(apiUrl, body, env, cacheManager);

    const data = responseData?.data?.course_list || [];
    await cacheManager.set(cacheKey, data);
    return data;
}

async function handleSubjects(url, env) {
    const courseId = url.searchParams.get("course_id");
    const courseType = url.searchParams.get("course_type");
    let apiUrl, body;
    if (courseType === "6") {
        apiUrl = `${API_BASE}/courses/Recorded_course/get_recoded_video_subject`;
        body = new URLSearchParams({ user_id: "303043", course_id: courseId });
    } else {
        apiUrl = `${API_BASE}/courses/course/get_course_video_topic_list`;
        body = new URLSearchParams({ user_id: "303043", id: courseId });
    }
    
    const responseData = await fetchFromApi(apiUrl, body, env);
    
    if (courseType === "6") {
        return responseData?.data?.subject_list || [];
    } else {
        return responseData?.data?.topic_video_data?.[0]?.list || [];
    }
}

async function handleTopics(url, env) {
    const courseId = url.searchParams.get("course_id");
    const subjectId = url.searchParams.get("subject_id");
    const apiUrl = `${API_BASE}/courses/Recorded_course/get_recorded_subject_topic`;
    const body = new URLSearchParams({
        user_id: "303043",
        course_id: courseId,
        subject_id: subjectId,
    });
    const responseData = await fetchFromApi(apiUrl, body, env);
    return responseData?.data || [];
}

async function handleVideos(url, env) {
    const courseId = url.searchParams.get("course_id");
    const subjectId = url.searchParams.get("subject_id");
    const topicId = url.searchParams.get("topic_id");
    const courseType = url.searchParams.get("course_type");
    let apiUrl, body;
    if (courseType === "6") {
        apiUrl = `${API_BASE}/courses/Recorded_course/get_recorded_topic_video`;
        body = new URLSearchParams({
            user_id: "303043",
            course_id: courseId,
            subject_id: subjectId,
            topic_id: topicId,
        });
    } else {
        apiUrl = `${API_BASE}/courses/course/get_video_topic_wise_list`;
        body = new URLSearchParams({
            user_id: "303043",
            course_id: courseId,
            topic_id: topicId,
        });
    }
    const responseData = await fetchFromApi(apiUrl, body, env);
    if (courseType === "6") return responseData?.data || [];
    return responseData?.data?.vedio_list || [];
}

async function handleQBankSubjects(url, env) {
    const courseId = url.searchParams.get("course_id");
    const apiUrl = `${API_BASE}/courses/crs/get_qbankcourse`;
    const body = new URLSearchParams({ user_id: "303043", course_id: courseId });
    const responseData = await fetchFromApi(apiUrl, body, env);
    return responseData?.data?.curriculam?.topics || [];
}

async function handleQBankTests(url, env) {
    const courseId = url.searchParams.get("course_id");
    const apiUrl = `${API_BASE}/test_series_course_type_test`;
    const body = new URLSearchParams({ user_id: "303043", course_id: courseId });
    const responseData = await fetchFromApi(apiUrl, body, env);
    return responseData?.data?.test_series || [];
}

async function handleQBankQuestions(url, env) {
    const testSeriesId = url.searchParams.get("test_series_id");
    const apiUrl = `${API_BASE}/courses/test_series/get_test_series_with_id_app`;
    const body = new URLSearchParams({
        user_id: "303043",
        test_series_id: testSeriesId,
    });
    const responseData = await fetchFromApi(apiUrl, body, env);
    return {
        basic_info: responseData?.data?.basic_info || {},
        questions: responseData?.data?.question_bank || [],
    };
}

async function handleTestSeriesList(url, env) {
    const courseId = url.searchParams.get("course_id");
    const apiUrl = `${API_BASE}/test-series/TestSeries/get_testseries`;
    const body = new URLSearchParams({ user_id: "303043", course_id: courseId });
    const responseData = await fetchFromApi(apiUrl, body, env);
    return responseData?.data?.test_series || [];
}

// This function was added to handle requests for test series questions specifically.
// It points to the correct API endpoint that you identified.
async function handleTestSeriesQuestions(url, env) {
    const testSeriesId = url.searchParams.get("test_series_id");
    const apiUrl = `${API_BASE}/test-series/TestSeries/get_test_question_data`;
    const body = new URLSearchParams({
        user_id: "303043",
        test_series_id: testSeriesId,
    });
    const responseData = await fetchFromApi(apiUrl, body, env);
    return {
        basic_info: responseData?.data?.basic_info || {},
        questions: responseData?.data?.question_bank || [],
    };
}

// Handle course notes and test data
async function handleCourseNotesAndTestData(url, env) {
    const courseId = url.searchParams.get("course_id");
    const apiUrl = `${API_BASE}//get_course_notes_and_test_data`;
    const body = new URLSearchParams({ user_id: "303043", id: courseId });
    const responseData = await fetchFromApi(apiUrl, body, env);
    return responseData?.data || [];
}

// Handle "My Plan" courses
async function handleMyPlanCourses(url, env) {
    const apiUrl = `${API_BASE}/get_list_of_my_plan_courses`;
    const body = new URLSearchParams({ user_id: "16" });
    const responseData = await fetchFromApi(apiUrl, body, env);

    // FIX: Return the entire data object containing both plan_list and course_list
    return responseData?.data || { plan_list: [], course_list: [] };
}

// handle plan child courses
async function handlePlanChildCourses(url, env) {
    const planId = url.searchParams.get("plan_id");
    const apiUrl = `${API_BASE}/get_plan_child_course`;
    const body = new URLSearchParams({ user_id: "303043", plan_id: planId });
    const responseData = await fetchFromApi(apiUrl, body, env);
    return responseData?.data || [];
}

// --- Authentication and User Management Functions ---

// Generate a secure activation code
function generateActivationCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 12; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Get user by email from KV storage
async function getUserByEmail(email, env) {
    try {
        console.log('getUserByEmail called with:', email);
        console.log('DAMS_KV available:', !!env.DAMS_KV);

        if (!env.DAMS_KV) {
            console.error('DAMS_KV not available in getUserByEmail');
            return null;
        }

        const userKey = `user:${email}`;
        console.log('Looking for user key:', userKey);

        const userData = await env.DAMS_KV.get(userKey);
        console.log('User data found:', !!userData);

        if (userData) {
            try {
                const user = JSON.parse(userData);
                console.log('User parsed successfully:', user.email, user.role);
                return user;
            } catch (parseError) {
                console.error('Error parsing user data:', parseError);
                return null;
            }
        }

        console.log('No user data found for:', email);
        return null;
    } catch (error) {
        console.error('Error in getUserByEmail:', error);
        return null;
    }
}

// Save user to KV storage
async function saveUser(user, env) {
    try {
        const userKey = `user:${user.email}`;
        await env.DAMS_KV.put(userKey, JSON.stringify(user));
        return true;
    } catch (error) {
        return false;
    }
}

// Update user session information
async function updateUserSession(email, ip, env) {
    try {
        const userKey = `user:${email}`;
        const userData = await env.DAMS_KV.get(userKey);
        if (!userData) return false;

        const user = JSON.parse(userData);
        user.last_seen = new Date().toISOString();
        user.ip_address = ip;
        user.is_online = true;

        await env.DAMS_KV.put(userKey, JSON.stringify(user));
        return true;
    } catch (error) {
        return false;
    }
}

// Get activation code from KV storage
async function getActivationCode(code, env) {
    try {
        const codeKey = `activation:${code}`;
        const codeData = await env.DAMS_KV.get(codeKey);
        return codeData ? JSON.parse(codeData) : null;
    } catch (error) {
        return null;
    }
}

// Save activation code to KV storage
async function saveActivationCode(codeData, env) {
    try {
        if (!env.DAMS_KV) {
            return false;
        }

        const codeKey = `activation:${codeData.code}`;
        await env.DAMS_KV.put(codeKey, JSON.stringify(codeData));
        return true;
    } catch (error) {
        return false;
    }
}

// Get all users from KV storage with optimized batch operations
async function getAllUsers(env) {
    try {
        const cacheManager = new KVCacheManager(env);
        const aggregatedKey = "aggregated:users";

        // Try to get from cache first
        const cachedUsers = await cacheManager.get(aggregatedKey, 60);
        if (cachedUsers) {
            return cachedUsers;
        }

        // Get all user keys in batches
        const allKeys = [];
        let cursor = null;

        do {
            const listResult = await env.DAMS_KV.list({
                prefix: "user:",
                cursor: cursor,
                limit: 100
            });

            allKeys.push(...listResult.keys.map(k => k.name));
            cursor = listResult.cursor;
        } while (cursor);

        if (allKeys.length === 0) {
            await cacheManager.set(aggregatedKey, []);
            return [];
        }

        // Process users in batches
        const users = [];
        const batches = [];

        for (let i = 0; i < allKeys.length; i += BATCH_SIZE) {
            batches.push(allKeys.slice(i, i + BATCH_SIZE));
        }

        for (const batch of batches) {
            const batchResults = await cacheManager.batchGet(batch);

            for (const [key, user] of batchResults.entries()) {
                if (user) {
                    // Check if user has expired
                    if (user.expires_at && new Date() > new Date(user.expires_at)) {
                        user.is_expired = true;
                        user.is_active = false;
                        // Update the user in storage (don't await to avoid blocking)
                        cacheManager.set(key, user, false);
                    }
                    users.push(user);
                }
            }
        }

        // Cache the results
        await cacheManager.set(aggregatedKey, users);

        return users;
    } catch (error) {
        console.error("Error in getAllUsers:", error);
        return [];
    }
}

// Delete user from KV storage
async function deleteUser(email, env) {
    try {
        const userKey = `user:${email}`;
        await env.DAMS_KV.delete(userKey);
        return true;
    } catch (error) {
        return false;
    }
}

// Delete activation code from KV storage
async function deleteActivationCode(code, env) {
    try {
        const codeKey = `activation:${code}`;
        await env.DAMS_KV.delete(codeKey);
        return true;
    } catch (error) {
        return false;
    }
}

// Update user information
async function updateUser(email, updates, env) {
    try {
        const userKey = `user:${email}`;
        const userData = await env.DAMS_KV.get(userKey);
        if (!userData) return false;

        const user = JSON.parse(userData);
        const updatedUser = { ...user, ...updates };

        await env.DAMS_KV.put(userKey, JSON.stringify(updatedUser));
        return true;
    } catch (error) {
        return false;
    }
}

// Handle user registration
async function handleRegister(request, env) {
    try {
        const { name, email, password, activationCode } = await request.json();

        // Validate required fields
        if (!name || !email || !password || !activationCode) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "All fields are required",
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Check if user already exists
        const existingUser = await getUserByEmail(email, env);
        if (existingUser) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "User already exists",
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Validate activation code
        const codeData = await getActivationCode(activationCode, env);
        if (!codeData) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Invalid activation code",
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Check if code is expired
        if (new Date() > new Date(codeData.expires_at)) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Activation code has expired",
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Check if code is already used
        if (codeData.used) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Activation code has already been used",
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Create new user with expiry linked to activation code
        const newUser = {
            id: Date.now().toString(),
            name,
            email,
            password, // In production, this should be hashed
            role: "user",
            created_at: new Date().toISOString(),
            activated_with: activationCode,
            expires_at: codeData.expires_at, // Link user expiry to activation code expiry
            is_expired: false,
            is_active: true,
        };

        // Save user
        const userSaved = await saveUser(newUser, env);
        if (!userSaved) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Failed to save user",
                }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Mark activation code as used
        codeData.used = true;
        codeData.used_by = email;
        codeData.used_at = new Date().toISOString();
        await saveActivationCode(codeData, env);

        return new Response(
            JSON.stringify({
                success: true,
                message: "User registered successfully",
                user: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role,
                    created_at: newUser.created_at,
                },
            }),
            {
                status: 201,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: "Internal server error",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}

// Handle user logout (mark as offline)
async function handleLogoutUser(request, env) {
    try {
        const { email } = await request.json();

        if (!email) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Email is required",
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        const userKey = `user:${email}`;
        const userData = await env.DAMS_KV.get(userKey);
        if (!userData) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "User not found",
                }),
                {
                    status: 404,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        const user = JSON.parse(userData);
        user.is_online = false;

        await env.DAMS_KV.put(userKey, JSON.stringify(user));

        return new Response(
            JSON.stringify({
                success: true,
                message: "User marked as offline",
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: "Failed to logout user",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}

// Handle user login
async function handleLogin(request, env) {
    try {
        const { email, password } = await request.json();

        // Validate required fields
        if (!email || !password) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Email and password are required",
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Get user
        const user = await getUserByEmail(email, env);
        if (!user) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Invalid credentials",
                }),
                {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Check password (in production, use proper password hashing)
        if (user.password !== password) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Invalid credentials",
                }),
                {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Get client IP address
        const clientIP =
            request.headers.get("CF-Connecting-IP") ||
            request.headers.get("X-Forwarded-For") ||
            request.headers.get("X-Real-IP") ||
            "Unknown";

        // Update user session information
        await updateUserSession(email, clientIP, env);

        // Generate token (simple token for demo)
        const token = "token-" + Date.now() + "-" + Math.random().toString(36);

        // Store session in KV for token validation
        const sessionData = {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                created_at: user.created_at,
                expires_at: user.expires_at,
                is_expired: user.is_expired,
                is_active: user.is_active,
            },
            token: token,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            ip_address: clientIP,
        };

        console.log('Storing session data for user:', user.email);
        console.log('Session data structure:', {
            userRole: sessionData.user.role,
            userEmail: sessionData.user.email,
            sessionExpires: sessionData.expires_at
        });

        // Store session data in KV
        const sessionKey = `session:${token}`;
        console.log('Session key:', sessionKey);

        try {
            const storeResult = await env.DAMS_KV.put(sessionKey, JSON.stringify(sessionData));
            console.log('Session stored successfully:', !!storeResult);

            // Verify the session was stored correctly
            const verifyData = await env.DAMS_KV.get(sessionKey);
            console.log('Session verification - data found:', !!verifyData);

            if (verifyData) {
                const parsedVerify = JSON.parse(verifyData);
                console.log('Verified session data:', {
                    userEmail: parsedVerify.user?.email,
                    userRole: parsedVerify.user?.role,
                    token: parsedVerify.token ? 'Present' : 'Missing'
                });
            }
        } catch (error) {
            console.error('Error storing session:', error);
        }

        // EXPIRY DATE FIX: Create a user payload that includes the expiry date
        // but omits the password for security.
        const userPayload = {
            ...user,
            password: undefined, // Never send the password to the client
            last_seen: new Date().toISOString(),
            ip_address: clientIP,
            is_online: true,
        };

        return new Response(
            JSON.stringify({
                success: true,
                message: "Login successful",
                user: userPayload, // Send the complete user object (without password)
                token: token,
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: "Internal server error",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}

// Handle activation code generation
async function handleGenerateActivationCodes(request, env) {
    try {
        const { quantity = 1, expiryDays = 30 } = await request.json();

        // Check if KV namespace is available
        if (!env.DAMS_KV) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "KV storage not configured",
                }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        const codes = [];
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiryDays);

        for (let i = 0; i < quantity; i++) {
            const code = generateActivationCode();
            const codeData = {
                code: code,
                created_at: new Date().toISOString(),
                expires_at: expiryDate.toISOString(),
                used: false,
                used_by: null,
                used_at: null,
            };

            const saved = await saveActivationCode(codeData, env);
            if (!saved) {
                return new Response(
                    JSON.stringify({
                        success: false,
                        error: "Failed to save activation code",
                    }),
                    {
                        status: 500,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            }

            codes.push(codeData);
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: `Generated ${quantity} activation code(s)`,
                codes: codes,
            }),
            {
                status: 201,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: "Failed to generate activation codes",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}

// Handle updating a user (admin only)
async function handleUpdateUser(request, env) {
    try {
        const { email, updates } = await request.json();

        if (!email || !updates) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Email and updates are required",
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        const success = await updateUser(email, updates, env);
        if (!success) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "User not found or update failed",
                }),
                {
                    status: 404,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: "User updated successfully",
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: "Failed to update user",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}

// Handle deleting a user (admin only)
async function handleDeleteUser(request, env) {
    try {
        const { email } = await request.json();

        if (!email) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Email is required",
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        const success = await deleteUser(email, env);
        if (!success) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "User not found or deletion failed",
                }),
                {
                    status: 404,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: "User deleted successfully",
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: "Failed to delete user",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}

// Handle delete activation code
async function handleDeleteActivationCode(request, env) {
    try {
        const { code } = await request.json();

        // Validate required fields
        if (!code) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Activation code is required",
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Check if activation code exists
        const codeData = await getActivationCode(code, env);
        if (!codeData) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Activation code not found",
                }),
                {
                    status: 404,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Delete activation code
        const codeDeleted = await deleteActivationCode(code, env);
        if (!codeDeleted) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Failed to delete activation code",
                }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: "Activation code deleted successfully",
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: "Internal server error",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}

// Handle getting all users (admin only) with optimization
async function handleGetUsers(env) {
    try {
        const cacheManager = new KVCacheManager(env);
        const aggregatedKey = "aggregated:users_admin";

        // Try to get from cache first (shorter TTL for admin view)
        const cachedUsers = await cacheManager.get(aggregatedKey, 30); // 30 seconds cache
        if (cachedUsers) {
            return new Response(
                JSON.stringify({
                    success: true,
                    users: cachedUsers,
                }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Get all user keys efficiently
        const allKeys = [];
        let cursor = null;

        do {
            const listResult = await env.DAMS_KV.list({
                prefix: "user:",
                cursor: cursor,
                limit: 100
            });

            allKeys.push(...listResult.keys.map(k => k.name));
            cursor = listResult.cursor;
        } while (cursor);

        if (allKeys.length === 0) {
            await cacheManager.set(aggregatedKey, []);
            return new Response(
                JSON.stringify({
                    success: true,
                    users: [],
                }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Process users in optimized batches
        const users = [];
        const batches = [];

        for (let i = 0; i < allKeys.length; i += BATCH_SIZE) {
            batches.push(allKeys.slice(i, i + BATCH_SIZE));
        }

        for (const batch of batches) {
            const batchResults = await cacheManager.batchGet(batch);

            for (const [key, user] of batchResults.entries()) {
                if (user) {
                    // Remove sensitive data
                    delete user.password;

                    // Check if user has expired
                    if (user.expires_at && new Date() > new Date(user.expires_at)) {
                        user.is_expired = true;
                        user.is_active = false;
                        // Update in background
                        cacheManager.set(key, user, false);
                    }
                    users.push(user);
                }
            }
        }

        // Cache the results
        await cacheManager.set(aggregatedKey, users);

        return new Response(
            JSON.stringify({
                success: true,
                users: users,
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: "Failed to fetch users",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}

// Handle announcements
async function handleCreateAnnouncement(request, env) {
    try {
        const { title, content, type = "info", priority = "normal", expires_at } = await request.json();

        if (!title || !content) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Title and content are required",
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        const announcement = {
            id: Date.now().toString(),
            title,
            content,
            type, // info, warning, success, error
            priority, // low, normal, high, urgent
            created_at: new Date().toISOString(),
            expires_at: expires_at || null,
            is_active: true,
        };

        const announcementKey = `announcement:${announcement.id}`;
        await env.DAMS_KV.put(announcementKey, JSON.stringify(announcement));

        return new Response(
            JSON.stringify({
                success: true,
                message: "Announcement created successfully",
                announcement: announcement,
            }),
            {
                status: 201,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: "Failed to create announcement",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}

async function handleGetAnnouncements(env) {
    try {
        const keys = await env.DAMS_KV.list({ prefix: "announcement:" });
        const announcements = [];

        for (const key of keys.keys) {
            const announcementData = await env.DAMS_KV.get(key.name);
            if (announcementData) {
                const announcement = JSON.parse(announcementData);

                // Check if announcement has expired
                if (announcement.expires_at && new Date() > new Date(announcement.expires_at)) {
                    announcement.is_active = false;
                    await env.DAMS_KV.put(key.name, JSON.stringify(announcement));
                }

                if (announcement.is_active) {
                    announcements.push(announcement);
                }
            }
        }

        // Sort by priority and creation date
        announcements.sort((a, b) => {
            const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
            if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            }
            return new Date(b.created_at) - new Date(a.created_at);
        });

        return new Response(
            JSON.stringify({
                success: true,
                announcements: announcements,
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: "Failed to fetch announcements",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}

async function handleDeleteAnnouncement(request, env) {
    try {
        const { id } = await request.json();

        if (!id) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Announcement ID is required",
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        const announcementKey = `announcement:${id}`;
        const announcementData = await env.DAMS_KV.get(announcementKey);

        if (!announcementData) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Announcement not found",
                }),
                {
                    status: 404,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        await env.DAMS_KV.delete(announcementKey);

        return new Response(
            JSON.stringify({
                success: true,
                message: "Announcement deleted successfully",
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: "Failed to delete announcement",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}

// Handle getting all activation codes (admin only) with optimization
async function handleGetActivationCodes(env) {
    try {
        const cacheManager = new KVCacheManager(env);
        const aggregatedKey = "aggregated:activation_codes";

        // Try to get from cache first
        const cachedCodes = await cacheManager.get(aggregatedKey, 120); // 2 minutes cache
        if (cachedCodes) {
            return new Response(
                JSON.stringify({
                    success: true,
                    codes: cachedCodes,
                }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Get all activation code keys in batches
        const allKeys = [];
        let cursor = null;

        do {
            const listResult = await env.DAMS_KV.list({
                prefix: "activation:",
                cursor: cursor,
                limit: 100
            });

            allKeys.push(...listResult.keys.map(k => k.name));
            cursor = listResult.cursor;
        } while (cursor);

        if (allKeys.length === 0) {
            await cacheManager.set(aggregatedKey, []);
            return new Response(
                JSON.stringify({
                    success: true,
                    codes: [],
                }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Process codes in batches
        const codes = [];
        const batches = [];

        for (let i = 0; i < allKeys.length; i += BATCH_SIZE) {
            batches.push(allKeys.slice(i, i + BATCH_SIZE));
        }

        for (const batch of batches) {
            const batchResults = await cacheManager.batchGet(batch);

            for (const [key, code] of batchResults.entries()) {
                if (code) {
                    // Check if code is expired and update status
                    if (new Date(code.expires_at) < new Date()) {
                        code.is_expired = true;
                        // Update in background
                        cacheManager.set(key, code, false);
                    }
                    codes.push(code);
                }
            }
        }

        // Cache the results
        await cacheManager.set(aggregatedKey, codes);

        return new Response(
            JSON.stringify({
                success: true,
                codes: codes,
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: "Failed to fetch activation codes",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}
// Handle user impersonation (admin only) - Secure token-based version
async function handleImpersonate(request, env) {
    try {
        console.log('=== IMPERSONATION REQUEST START ===');

        // Authenticate the admin user via token
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return new Response(
                JSON.stringify({ success: false, error: "Authorization header missing or invalid" }),
                { status: 401 }
            );
        }
        const token = authHeader.substring(7);
        const adminUser = await validateAdminToken(token, env);

        if (!adminUser) {
            return new Response(
                JSON.stringify({ success: false, error: "Invalid or expired admin token" }),
                { status: 403 }
            );
        }

        // Get impersonation data from request body
        const { targetEmail } = await request.json();
        console.log('Impersonation request - admin email:', adminUser.email, 'target email:', targetEmail);

        if (!targetEmail) {
            console.log('Missing required fields');
            return new Response(
                JSON.stringify({ success: false, error: "targetEmail is required" }),
                { status: 400 }
            );
        }

        // Check if admin has permission
        if (adminUser.role !== "admin" && adminUser.role !== "supreme") {
            console.log('User does not have admin role:', adminUser.role);
            return new Response(
                JSON.stringify({ success: false, error: "Insufficient permissions for impersonation" }),
                { status: 403 }
            );
        }

        console.log('Admin authentication successful:', adminUser.email, 'role:', adminUser.role);

        // Get the target user to impersonate
        console.log('Looking up target user:', targetEmail);
        const targetUser = await getUserByEmail(targetEmail, env);

        if (!targetUser) {
            console.log('Target user not found');
            return new Response(
                JSON.stringify({ success: false, error: "Target user not found" }),
                { status: 404 }
            );
        }

        // Prevent admin from impersonating another admin
        if (targetUser.role === "admin" || targetUser.role === "supreme") {
            console.log('Cannot impersonate admin user');
            return new Response(
                JSON.stringify({ success: false, error: "Cannot impersonate admin users" }),
                { status: 403 }
            );
        }

        console.log('Target user found:', targetUser.email, 'role:', targetUser.role);

        // Generate a secure token for the impersonated user
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const impersonationToken = `impersonation-${timestamp}-${randomString}`;

        // Create impersonation payload with admin info for restoration
        const impersonationPayload = {
            ...targetUser,
            password: undefined, // Remove password
            impersonated_by: adminUser.email,
            impersonated_at: new Date().toISOString(),
            impersonation_token: impersonationToken
        };

        console.log('Creating response payload...');
        const responseData = {
            success: true,
            user: impersonationPayload,
            token: impersonationToken,
        };

        console.log('Response payload created successfully');
        console.log('Impersonation successful, returning response');
        console.log('=== IMPERSONATION REQUEST END ===');

        return new Response(
            JSON.stringify(responseData),
            { status: 200 }
        );
    } catch (error) {
        console.error("Impersonation error:", error);
        console.log('=== IMPERSONATION REQUEST ERROR ===');
        return new Response(
            JSON.stringify({ success: false, error: "Internal server error during impersonation" }),
            { status: 500 }
        );
    }
}

// Validate admin token
async function validateAdminToken(token, env) {
    try {
        console.log('Validating admin token:', token ? 'Token present' : 'No token');

        // This is a simplified validation - in production, you'd have proper JWT validation
        // For now, we'll check if the token exists and hasn't expired
        const tokenKey = `session:${token}`;
        console.log('Looking for session key:', tokenKey);

        const sessionData = await env.DAMS_KV.get(tokenKey);
        console.log('Session data found:', !!sessionData);

        if (!sessionData) {
            console.log('No session data found for token');
            return null;
        }

        const session = JSON.parse(sessionData);
        console.log('Parsed session data:', {
            hasUser: !!session.user,
            userRole: session.user?.role,
            userEmail: session.user?.email,
            expiresAt: session.expires_at,
            now: new Date().toISOString()
        });

        const now = new Date();

        if (new Date(session.expires_at) < now) {
            console.log('Session expired, cleaning up');
            // Clean up expired session
            await env.DAMS_KV.delete(tokenKey);
            return null;
        }

        // Validate that the user has admin or supreme role
        if (!session.user || (session.user.role !== "admin" && session.user.role !== "supreme")) {
            console.log('User does not have admin or supreme role:', session.user?.role);
            return null;
        }

        console.log('Token validation successful for user:', session.user.email);
        return session.user;
    } catch (error) {
        console.error("Token validation error:", error);
        return null;
    }
}

// Handle extending user access (admin only)
async function handleExtendUserAccess(request, env) {
    try {
        const { email, extension_days, new_expiry } = await request.json();

        if (!email) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Email is required",
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Get user from KV storage
        const user = await getUserByEmail(email, env);
        if (!user) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "User not found",
                }),
                {
                    status: 404,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Check if user is admin (admins don't have expiry dates)
        if (user.role === "admin" || user.role === "supreme") {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Cannot extend access for admin users",
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Calculate new expiry date
        let newExpiryDate;
        if (new_expiry) {
            newExpiryDate = new Date(new_expiry);
        } else if (extension_days) {
            newExpiryDate = new Date();
            newExpiryDate.setDate(newExpiryDate.getDate() + extension_days);
        } else {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Either new_expiry or extension_days is required",
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Update user with new expiry date
        const updates = {
            expires_at: newExpiryDate.toISOString(),
            is_expired: false,
            is_active: true,
        };

        const success = await updateUser(email, updates, env);
        if (!success) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Failed to update user access",
                }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: "User access extended successfully",
                new_expiry: newExpiryDate.toISOString(),
                extension_days: extension_days || null,
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: "Failed to extend user access",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}

// Handle getting build information
async function handleGetBuild(env) {
    try {
        // First check if we have a stored build number
        const storedBuild = await env.DAMS_KV.get("current_build_no");
        const buildNo = storedBuild || INITIAL_BUILD_NO.toString();

        return new Response(
            JSON.stringify({
                success: true,
                build_no: buildNo,
                working_build_no: buildNo,
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: "Failed to fetch build information",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}

// --- Background Cleanup Function ---
async function performBackgroundCleanup(env) {
    try {
        const cacheManager = new KVCacheManager(env);

        // Clean expired activation codes
        const expiredCodes = [];
        let cursor = null;

        do {
            const listResult = await env.DAMS_KV.list({
                prefix: "activation:",
                cursor: cursor,
                limit: 50
            });

            for (const key of listResult.keys) {
                const codeData = await cacheManager.get(key.name, 0); // No cache
                if (codeData && new Date(codeData.expires_at) < new Date()) {
                    expiredCodes.push(key.name);
                }
            }

            cursor = listResult.cursor;
        } while (cursor && expiredCodes.length < 100); // Limit cleanup to 100 items

        // Delete expired codes in batches
        if (expiredCodes.length > 0) {
            const deletePromises = expiredCodes.map(codeKey =>
                env.DAMS_KV.delete(codeKey)
            );

            await Promise.allSettled(deletePromises);
            console.log(`Cleaned up ${expiredCodes.length} expired activation codes`);
        }

        // Clean expired users
        const expiredUsers = [];
        cursor = null;

        do {
            const listResult = await env.DAMS_KV.list({
                prefix: "user:",
                cursor: cursor,
                limit: 50
            });

            for (const key of listResult.keys) {
                const userData = await cacheManager.get(key.name, 0); // No cache
                if (userData && userData.expires_at &&
                    new Date(userData.expires_at) < new Date() &&
                    userData.role !== "admin" && userData.role !== "supreme") {
                    expiredUsers.push(key.name);
                }
            }

            cursor = listResult.cursor;
        } while (cursor && expiredUsers.length < 50); // Limit cleanup to 50 users

        // Delete expired users in batches
        if (expiredUsers.length > 0) {
            const deletePromises = expiredUsers.map(userKey =>
                env.DAMS_KV.delete(userKey)
            );

            await Promise.allSettled(deletePromises);
            console.log(`Cleaned up ${expiredUsers.length} expired users`);
        }

        // Clean cache manager
        cacheManager.cleanExpiredCache();

        // Update aggregated data cache
        await cacheManager.setAggregatedData("users", null); // Force refresh
        await cacheManager.setAggregatedData("activation_codes", null); // Force refresh

        return { success: true, cleanedCodes: expiredCodes.length, cleanedUsers: expiredUsers.length };
    } catch (error) {
        console.error("Background cleanup failed:", error);
        return { success: false, error: error.message };
    }
}

// --- Main Worker ---
export default {
    // Scheduled task for periodic cleanup
    async scheduled(event, env, ctx) {
        console.log("Running scheduled cleanup...");
        const result = await performBackgroundCleanup(env);

        if (result.success) {
            console.log(`Cleanup completed: ${result.cleanedCodes} codes, ${result.cleanedUsers} users`);
        } else {
            console.error("Scheduled cleanup failed:", result.error);
        }
    },

    async fetch(request, env) {
        const url = new URL(request.url);
        const action = url.searchParams.get("action");

        // --- AUTO BUILD DETECTION ON FIRST REQUEST ---
        // Check if we have a stored build number, if not, find the best one
        const hasStoredBuild = await env.DAMS_KV.get("current_build_no");
        if (!hasStoredBuild) {
            console.log("No stored build number found, running build detection...");
            try {
                await findAndStoreLatestBuild(env);
            } catch (error) {
                console.error("Build detection failed on startup:", error);
            }
        }

        // Handle CORS preflight requests
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization",
                    "Access-Control-Max-Age": "86400",
                },
            });
        }

        // --- BUILD DETECTION ACTION ---
        if (action === "update_build") {
            const result = await findAndStoreLatestBuild(env);
            return new Response(JSON.stringify(result), {
                status: result.success ? 200 : 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        // --- DEBUG ACTION ---
        if (action === "debug_sessions") {
            try {
                const allSessions = await env.DAMS_KV.list({ prefix: "session:" });
                const sessions = [];

                for (const key of allSessions.keys) {
                    const sessionData = await env.DAMS_KV.get(key.name);
                    if (sessionData) {
                        const session = JSON.parse(sessionData);
                        sessions.push({
                            key: key.name,
                            userEmail: session.user?.email,
                            userRole: session.user?.role,
                            expiresAt: session.expires_at,
                            createdAt: session.created_at,
                            hasToken: !!session.token
                        });
                    }
                }

                const response = new Response(JSON.stringify({
                    success: true,
                    totalSessions: sessions.length,
                    sessions: sessions
                }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });

                // Add CORS headers
                const headers = new Headers(response.headers);
                headers.set("Access-Control-Allow-Origin", "*");
                headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: headers,
                });
            } catch (error) {
                const response = new Response(JSON.stringify({
                    success: false,
                    error: error.message
                }), {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                });

                // Add CORS headers
                const headers = new Headers(response.headers);
                headers.set("Access-Control-Allow-Origin", "*");
                headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: headers,
                });
            }
        }

        // --- Background cleanup action ---
        if (action === "cleanup") {
            const result = await performBackgroundCleanup(env);
            return new Response(JSON.stringify(result), {
                status: result.success ? 200 : 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Handle authentication actions
        if (action === "register") {
            const response = await handleRegister(request, env);
            // Add CORS headers to the response
            const headers = new Headers(response.headers);
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, OPTIONS"
            );
            headers.set(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization"
            );
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers,
            });
        }

        if (action === "login") {
            const response = await handleLogin(request, env);
            const headers = new Headers(response.headers);
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, OPTIONS"
            );
            headers.set(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization"
            );
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers,
            });
        }

        if (action === "logout_user") {
            const response = await handleLogoutUser(request, env);
            const headers = new Headers(response.headers);
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, OPTIONS"
            );
            headers.set(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization"
            );
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers,
            });
        }

        if (action === "create_announcement") {
            const response = await handleCreateAnnouncement(request, env);
            const headers = new Headers(response.headers);
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, OPTIONS"
            );
            headers.set(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization"
            );
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers,
            });
        }

        if (action === "get_announcements") {
            const response = await handleGetAnnouncements(env);
            const headers = new Headers(response.headers);
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, OPTIONS"
            );
            headers.set(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization"
            );
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers,
            });
        }

        if (action === "delete_announcement") {
            const response = await handleDeleteAnnouncement(request, env);
            const headers = new Headers(response.headers);
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, OPTIONS"
            );
            headers.set(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization"
            );
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers,
            });
        }

        if (action === "delete_user") {
            const response = await handleDeleteUser(request, env);
            const headers = new Headers(response.headers);
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, OPTIONS"
            );
            headers.set(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization"
            );
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers,
            });
        }

        if (action === "update_user") {
            const response = await handleUpdateUser(request, env);
            const headers = new Headers(response.headers);
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, OPTIONS"
            );
            headers.set(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization"
            );
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers,
            });
        }

        if (action === "get_users") {
            const response = await handleGetUsers(env);
            const headers = new Headers(response.headers);
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, OPTIONS"
            );
            headers.set(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization"
            );
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers,
            });
        }

        if (action === "get_activation_codes") {
            const response = await handleGetActivationCodes(env);
            const headers = new Headers(response.headers);
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, OPTIONS"
            );
            headers.set(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization"
            );
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers,
            });
        }

        if (action === "delete_activation_code") {
            const response = await handleDeleteActivationCode(request, env);
            const headers = new Headers(response.headers);
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, OPTIONS"
            );
            headers.set(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization"
            );
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers,
            });
        }

        if (action === "generate_codes") {
            const response = await handleGenerateActivationCodes(request, env);
            const headers = new Headers(response.headers);
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, OPTIONS"
            );
            headers.set(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization"
            );
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers,
            });
        }

        if (action === "get_users") {
            const response = await handleGetUsers(env);
            const headers = new Headers(response.headers);
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, OPTIONS"
            );
            headers.set(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization"
            );
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers,
            });
        }

        if (action === "get_codes") {
            const response = await handleGetActivationCodes(env);
            const headers = new Headers(response.headers);
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, OPTIONS"
            );
            headers.set(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization"
            );
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers,
            });
        }

        // Inside the main fetch handler, before the "download" action. Implement impersonation.
        if (action === "impersonate") {
            const response = await handleImpersonate(request, env);
            const headers = new Headers(response.headers);
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, OPTIONS"
            );
            headers.set(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization"
            );
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers,
            });
        }

        // Handle extending user access (admin only)
        if (action === "extend_user_access") {
            const response = await handleExtendUserAccess(request, env);
            const headers = new Headers(response.headers);
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, OPTIONS"
            );
            headers.set(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization"
            );
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers,
            });
        }

        // Handle getting build information
        if (action === "get_build") {
            const response = await handleGetBuild(env);
            const headers = new Headers(response.headers);
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, OPTIONS"
            );
            headers.set(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization"
            );
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers,
            });
        }
        // Handles file download requests
        if (action === "download") {
            const fileUrl = url.searchParams.get("url");
            const fileName = url.searchParams.get("filename");
            if (!fileUrl || !fileName)
                return new Response("Missing URL or filename parameter", {
                    status: 400,
                });
            const requestHeaders = new Headers(request.headers);
            requestHeaders.delete("host");
            const fileResponse = await fetch(fileUrl, { headers: requestHeaders });
            if (!fileResponse.ok)
                return new Response("Failed to fetch file from source.", {
                    status: fileResponse.status,
                });
            const responseHeaders = new Headers(fileResponse.headers);
            responseHeaders.set(
                "Content-Disposition",
                `attachment; filename="${decodeURIComponent(fileName)}"`
            );
            responseHeaders.set("Accept-Ranges", "bytes");
            responseHeaders.set("X-Content-Type-Options", "nosniff");
            return new Response(fileResponse.body, {
                headers: responseHeaders,
                status: fileResponse.status,
                statusText: fileResponse.statusText,
            });
        }

        // --- DEBUG ENDPOINT: Test exact API call ---
        if (action === "debug_api_call") {
            try {
                // Make the exact same call as the working curl
                const apiUrl = `${API_BASE}/courses/course/get_course_video_topic_list`;
                const body = new URLSearchParams({ user_id: "303043", id: "1414" });
                
                // Always use INITIAL_BUILD_NO
                const buildNoToUse = INITIAL_BUILD_NO.toString();

                const apiHeaders = {
                    accept: "application/json",
                    authorization: env.AUTH_TOKEN,
                    device_tokken: env.DEVICE_TOKEN,
                    user_id: "303043",
                    device_type: "1",
                    build_no: buildNoToUse,
                    api_version: "10",
                    stream_id: "1",
                    "content-type": "application/x-www-form-urlencoded",
                    "user-agent": "okhttp/4.12.0",
                };

                const response = await fetch(apiUrl, {
                    method: "POST",
                    headers: apiHeaders,
                    body,
                });
                
                const responseText = await response.text();

                let parsedData;
                try {
                    parsedData = JSON.parse(responseText);
                } catch (parseError) {
                    parsedData = { parseError: parseError.message, rawResponse: responseText };
                }

                return new Response(JSON.stringify({
                    success: true,
                    debug: {
                        apiUrl: apiUrl,
                        body: Object.fromEntries(body),
                        responseStatus: response.status,
                        responseStatusText: response.statusText,
                        rawResponseLength: responseText.length,
                        rawResponsePreview: responseText.substring(0, 200),
                        parsedData: parsedData,
                        buildNumberUsed: buildNoToUse
                    }
                }), {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                        "Access-Control-Allow-Headers": "Content-Type, Authorization",
                    },
                });
            } catch (error) {
                return new Response(JSON.stringify({
                    success: false,
                    error: error.message
                }), {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    },
                });
            }
        }

        // Handles API data requests
        try {
            const view = url.searchParams.get("view") || "categories";
            let dataToSend;

            // --- Main Router ---
            // This switch statement directs the request to the correct handler based on the 'view' parameter.
            switch (view) {
                case "categories":
                    dataToSend = await handleCategories(url, env);
                    break;
                case "courses":
                    dataToSend = await handleCourses(url, env);
                    break;
                case "subjects":
                    dataToSend = await handleSubjects(url, env);
                    break;
                case "topics":
                    dataToSend = await handleTopics(url, env);
                    break;
                case "videos":
                    dataToSend = await handleVideos(url, env);
                    break;
                case "qbank_subjects":
                    dataToSend = await handleQBankSubjects(url, env);
                    break;
                case "qbank_tests":
                    dataToSend = await handleQBankTests(url, env);
                    break;
                case "qbank_questions":
                    dataToSend = await handleQBankQuestions(url, env);
                    break;
                case "test_series_list":
                    dataToSend = await handleTestSeriesList(url, env);
                    break;
                case "course_notes_and_test_data": // This is the new case
                    dataToSend = await handleCourseNotesAndTestData(url, env);
                    break;
                case "my_plan_courses": // This is the new case
                    dataToSend = await handleMyPlanCourses(url, env);
                    break;
                case "plan_child_courses": // This is the new case
                    dataToSend = await handlePlanChildCourses(url, env);
                    break;
                // --- CORRECTED ROUTE ---
                // This new case routes requests for 'test_series_questions' to our new handler.
                case "test_series_questions":
                    dataToSend = await handleTestSeriesQuestions(url, env);
                    break;
                default:
                    throw new Error("Invalid view specified");
            }

            // Return the final data as a JSON response
            return new Response(JSON.stringify(dataToSend), {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization",
                },
            });
        } catch (error) {
            console.error('API request error:', error);
            return new Response(JSON.stringify({ error: "Internal server error", details: error.message }), {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                },
            });
        }
    }
};
