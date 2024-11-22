async function fetchPlayerState() {
    try {
        // Query the Cosmos endpoint for player state
        const state = Spicetify.Player.data;
        return state;
    } catch (error) {
        console.error("Failed to fetch player state:", error);
        throw error;
    }
}

async function GetProgress() {
    const state = await fetchPlayerState();

    // Extract necessary fields from the state
    const { isPaused, timestamp, positionAsOfTimestamp } = state;

    // Calculate progress
    if (isPaused) {
        return positionAsOfTimestamp;
    }
    return (Date.now() - timestamp) + positionAsOfTimestamp;
}

export default GetProgress;