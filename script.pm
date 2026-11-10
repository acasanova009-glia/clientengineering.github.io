const response = pm.response.json();

if (response.self) {
    const baseUrl = "https://api.beta.glia.com";
    const taskUrl = baseUrl + response.self;
    const token = pm.environment.get("bearer_token") || pm.request.headers.get("Authorization");

    function pollTask(attemptsLeft) {
        if (attemptsLeft <= 0) {
            console.error("Timed out waiting for version creation to finish.");
            return;
        }

        setTimeout(() => {
            pm.sendRequest({
                url: taskUrl,
                method: 'GET',
                header: {
                    'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`
                }
            }, (err, res) => {
                if (err) {
                    console.error("Error polling task:", err);
                    return;
                }

                let taskData = {};
                try {
                    taskData = res.json();
                } catch (e) {
                    taskData = {};
                }

                // Check for completion status or completed payload
                if (taskData.status === "completed" || res.code === 303) {
                    // Extract version ID prioritizing Glia's entity object
                    const versionId = 
                        (taskData.entity && taskData.entity.id) ||
                        taskData.version_id ||
                        taskData.id;

                    if (versionId) {
                        pm.environment.set("current_version_id", versionId);
                        console.log("SUCCESS: Saved version ID to environment:", versionId);
                        return;
                    }
                }

                if (taskData.status === "processing" || res.code === 200) {
                    console.log("Still processing, polling again...");
                    pollTask(attemptsLeft - 1);
                } else {
                    console.warn("Poll finished with unexpected response:", taskData);
                }
            });
        }, 2000);
    }

    pollTask(10);
}