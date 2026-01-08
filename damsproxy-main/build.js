// --- Build Monitor Worker (Parallel Check, Stop at First Success) ---
// This script checks the next 50 potential build numbers concurrently,
// and stops processing as soon as it finds the first working one.

// --- API Configuration ---
const API_BASE = "https://api.damsdelhi.com/v2_data_model";
const BUILD_ENDPOINT = `${API_BASE}/courses/Home/get_homescreen_categorydata`;

// --- Handler for triggering the parallel build check ---
async function handleCheckNow(env) {
    console.log("Manual trigger: Starting parallel build check...");
    
    // --- Configuration for the check ---
    const startBuildNo = 517;
    const checkLimit = 50; // Check the next 50 build numbers

    let result = {
        status: "error",
        message: "No working build number found within the limit.",
        working_build_no: "N/A",
        timestamp: new Date().toISOString()
    };
    
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
                // Log the network status for each request
                console.log(`Build ${currentBuildNo} - Network Status: ${response.status}`);
                return response.json().then(data => ({ data, response, buildNo: currentBuildNo }));
            }).catch(e => {
                // Log and return network errors
                console.error(`Build ${currentBuildNo} - Network Error: ${e.message}`);
                return { error: e, response: null, buildNo: currentBuildNo };
            })
        );
    }
    
    try {
        const allResponses = await Promise.all(promises);
        
        let foundWorkingBuild = false;
        for (const { data, response, buildNo } of allResponses) {
            // Check for a successful network response AND a success status in the JSON body
            if (response && response.ok && data?.status === true) {
                console.log(`Build ${buildNo} - API Response Status: SUCCESS`);
                console.log(`Working build found: ${buildNo}. Stopping further checks.`);
                
                // Save the working build number to KV
                await env.DAMS_KV.put("current_build_no", buildNo.toString());
                await env.DAMS_KV.put("last_check_result", JSON.stringify({
                    status: "success",
                    message: `Working build number found: ${buildNo}.`,
                    working_build_no: buildNo,
                    timestamp: new Date().toISOString()
                }));
                
                result = {
                    status: "success",
                    message: "Working build number found.",
                    working_build_no: buildNo,
                    timestamp: new Date().toISOString()
                };
                foundWorkingBuild = true;
                break; // This is the key change! It stops the loop.
            } else {
                // Log the failure
                console.log(`Build ${buildNo} - API Response Status: FAILURE. Response: ${JSON.stringify(data)}`);
            }
        }
        
        if (!foundWorkingBuild) {
            console.log("No working build number found within the limit.");
            result.message = "No working build number found within the limit or data format is incorrect.";
            await env.DAMS_KV.put("last_check_result", JSON.stringify(result));
        }

    } catch (e) {
        console.error("Critical error during parallel build number check:", e);
        result.message = `Critical Error: ${e.message}`;
        await env.DAMS_KV.put("last_check_result", JSON.stringify(result));
    }
    
    return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" }
    });
}

// --- Fetch Handler: Serves a web page or triggers the check ---
async function handleRequest(request, env) {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    // If the 'action' parameter is 'check_now', run the check
    if (action === "check_now") {
        return handleCheckNow(env);
    }
    
    // Otherwise, serve the web page with the last known result
    try {
        const resultString = await env.DAMS_KV.get("last_check_result");
        const result = JSON.parse(resultString || "{}");
        const statusClass = result.status === 'success' ? 'unchanged' : result.status === 'changed' ? 'changed' : 'error';
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>DAMS API Build Monitor</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333; margin: 2rem; }
        .container { max-width: 600px; margin: auto; padding: 2rem; background: #fff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { text-align: center; color: #4CAF50; }
        .status { padding: 10px; border-radius: 5px; text-align: center; font-weight: bold; }
        .changed { background-color: #d4edda; color: #28a745; }
        .unchanged { background-color: #d4edda; color: #28a745; }
        .error { background-color: #f8d7da; color: #dc3545; }
        pre { background: #eee; padding: 1rem; border-radius: 5px; white-space: pre-wrap; word-wrap: break-word; }
        a.button { display: inline-block; padding: 10px 20px; font-size: 16px; color: #fff; background-color: #007bff; border-radius: 5px; text-decoration: none; text-align: center; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>API Build Status</h1>
        <p>This page shows the result of the last build check.</p>
        <div class="status ${statusClass}">
            ${result.message}
        </div>
        <h3>Details</h3>
        <pre>${JSON.stringify(result, null, 2)}</pre>
        <a href="?action=check_now" class="button">Trigger Manual Check</a>
    </div>
</body>
</html>
        `;

        return new Response(html, {
            headers: {
                "content-type": "text/html;charset=UTF-8",
            },
        });
    } catch (e) {
        const errorHtml = `
            <h1>Error</h1>
            <p>An error occurred: ${e.message}</p>
        `;
        return new Response(errorHtml, { status: 500 });
    }
}

// --- Main export block ---
// Note: This is loaded as a regular script, not as a module
const buildWorker = {
    async fetch(request, env) {
        return handleRequest(request, env);
    }
};