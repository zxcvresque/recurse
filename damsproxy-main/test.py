import json
from mitmproxy import http

# Define the target URL that we want to intercept.
TARGET_URL = "https://api.damsdelhi.com/v1_data_model/test-series/TestSeries/get_testseries"

def response(flow: http.HTTPFlow) -> None:
    """
    This function is called for every HTTP response that mitmproxy sees.
    """
    # Check if the request URL matches our target.
    if flow.request.pretty_url == TARGET_URL:
        print(f"[+] Intercepted response from: {TARGET_URL}")

        try:
            # 1. Decode the JSON response from bytes into a Python dictionary.
            # We use .decode('utf-8', errors='ignore') to prevent crashes on invalid characters.
            data = json.loads(flow.response.content.decode('utf-8', errors='ignore'))

            # 2. Navigate to the list of tests and modify it.
            # We use .get() to safely access nested keys that might not exist.
            test_series_list = data.get("data", {}).get("test_series", [])
            
            modified_count = 0
            if test_series_list:
                for test in test_series_list:
                    # Check if the 'is_free' key exists and is "0".
                    if "is_free" in test and test["is_free"] == "0":
                        test["is_free"] = "1"  # Change the value to "1" (as a string).
                        modified_count += 1
            
            print(f"[+] Modified {modified_count} test series entries to be free.")

            # 3. Encode the modified Python dictionary back into a JSON string (as bytes).
            modified_response_body = json.dumps(data).encode('utf-8')

            # 4. Replace the original response with our modified one.
            flow.response.content = modified_response_body

        except json.JSONDecodeError:
            print(f"[!] Could not decode JSON for {TARGET_URL}")
        except Exception as e:
            print(f"[!] An error occurred: {e}")
