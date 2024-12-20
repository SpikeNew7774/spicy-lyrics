import { SpikyCache } from "@spikerko/web-modules/SpikyCache";
import storage from "../storage";
import Defaults from "../../components/Global/Defaults";
import SpicyFetch from "../API/SpicyFetch";

export const lyricsCache = new SpikyCache({
    name: "SpikyCache_Spicy_Lyrics"
})

export default async function fetchLyrics(uri: string) {
    if (!document.querySelector("#SpicyLyricsPage")) return;

    if (document.querySelector("#SpicyLyricsPage .LyricsContainer .LyricsContent").classList.contains("offline")) {
        document.querySelector("#SpicyLyricsPage .LyricsContainer .LyricsContent").classList.remove("offline");
    }

    document.querySelector("#SpicyLyricsPage .ContentBox .LyricsContainer").classList.remove("Hidden");

    const currFetching = storage.get("currentlyFetching");
    if (currFetching == "true") return;

    storage.set("currentlyFetching", "true");
    

    ClearLyricsPageContainer()

    // I'm not sure if this will entirely work, because in my country the Spotify DJ isn't available. So if anybody finds out that this doesn't work, please let me know.
    if (
        Spicetify.Player.data?.item?.type &&
        Spicetify.Player.data?.item?.type === "unknown" &&
        Spicetify.Player.data?.item?.provider &&
        Spicetify.Player.data?.item?.provider?.startsWith("narration")
    ) return DJMessage();

    if (Spicetify.Player.data?.item?.mediaType && Spicetify.Player.data?.item?.mediaType !== "audio") return NotTrackMessage();

    const trackId = uri.split(":")[2];
    
    // Check if there's already data in localStorage
    const savedLyricsData = storage.get("currentLyricsData");

    if (savedLyricsData) {
        try {
            if (savedLyricsData.includes("NO_LYRICS")) {
                const split = savedLyricsData.split(":");
                const id = split[1];
                if (id === trackId) {
                    return noLyricsMessage();
                }
            }
            const lyricsData = JSON.parse(savedLyricsData);
            // Return the stored lyrics if the ID matches the track ID
            if (lyricsData?.id === trackId) {
                storage.set("currentlyFetching", "false");
                HideLoaderContainer()
                ClearLyricsPageContainer()
                Defaults.CurrentLyricsType = lyricsData.Type;
                return lyricsData;
            }
        } catch (error) {
            console.error("Error parsing saved lyrics data:", error);
            storage.set("currentlyFetching", "false");
            HideLoaderContainer()
            ClearLyricsPageContainer()
        }
    }


    if (lyricsCache) {
        try {
            const lyricsFromCache = await lyricsCache.get(trackId);
            if (lyricsFromCache) {
                if (lyricsFromCache === "NO_LYRICS") {
                    return noLyricsMessage();
                }
                if (navigator.onLine && lyricsFromCache?.expiresAt < new Date().getTime()) {
                    await lyricsCache.remove(trackId);
                } else {
                    storage.set("currentLyricsData", JSON.stringify(lyricsFromCache));
                    storage.set("currentlyFetching", "false");
                    HideLoaderContainer()
                    ClearLyricsPageContainer()
                    Defaults.CurrentLyricsType = lyricsFromCache.Type;
                    return { ...lyricsFromCache, fromCache: true };
                }
            }
        } catch (error) {
            ClearLyricsPageContainer()
            console.log("Error parsing saved lyrics data:", error);
            return noLyricsMessage();
        }
    }

    if (!navigator.onLine) return urOfflineMessage();

    ShowLoaderContainer()


    // Fetch new lyrics if no match in localStorage
    /* const lyricsApi = storage.get("customLyricsApi") ?? Defaults.LyricsContent.api.url;
    const lyricsAccessToken = storage.get("lyricsApiAccessToken") ?? Defaults.LyricsContent.api.accessToken; */

    try {
        const response = await SpicyFetch(`lyrics/${trackId}`);

        if (response.status !== 200) {
            if (response.status === 401) {
                storage.set("currentlyFetching", "false");
               //fetchLyrics(uri);
                window.location.reload();
                return;
            }
            ClearLyricsPageContainer()
            return noLyricsMessage();
        }

        const lyricsText = await response.text();

        ClearLyricsPageContainer();

        if (lyricsText === "") return noLyricsMessage();

        const lyricsJson = JSON.parse(lyricsText);

        // Store the new lyrics in localStorage
        storage.set("currentLyricsData", JSON.stringify(lyricsJson));

        storage.set("currentlyFetching", "false");

        HideLoaderContainer()

        ClearLyricsPageContainer();

        if (lyricsCache) {
            const expiresAt = new Date().getTime() + 1000 * 60 * 60 * 24 * 7; // Expire after 7 days

            try {
                await lyricsCache.set(trackId, {
                    ...lyricsJson,
                    expiresAt
                });
            } catch (error) {
                console.error("Error saving lyrics to cache:", error);
            }
        }

        Defaults.CurrentLyricsType = lyricsJson.Type;

        return { ...lyricsJson, fromCache: false };
    } catch (error) {
        console.error("Error fetching lyrics:", error);
        storage.set("currentlyFetching", "false");
        ClearLyricsPageContainer();
        return noLyricsMessage();
    }
    
}


function noLyricsMessage() {
    /* const totalTime = Spicetify.Player.getDuration() / 1000;
    const segmentDuration = totalTime / 3;
    
    const noLyricsMessage = {
        "Type": "Syllable",
        "alternative_api": false,
        "Content": [
            {
                "Type": "Vocal",
                "OppositeAligned": false,
                "Lead": {
                    "Syllables": [
                        {
                            "Text": "We're working on the Lyrics...",
                            "StartTime": 0,
                            "EndTime": 10,
                            "IsPartOfWord": false
                        }
                    ],
                    "StartTime": 0,
                    "EndTime": 10
                }
            },
            {
                "Type": "Vocal",
                "OppositeAligned": false,
                "Lead": {
                    "Syllables": [
                        {
                            "Text": "♪",
                            "StartTime": 0,
                            "EndTime": segmentDuration,
                            "IsPartOfWord": true
                        },
                        {
                            "Text": "♪",
                            "StartTime": segmentDuration,
                            "EndTime": 2 * segmentDuration,
                            "IsPartOfWord": true
                        },
                        {
                            "Text": "♪",
                            "StartTime": 2 * segmentDuration,
                            "EndTime": totalTime,
                            "IsPartOfWord": false
                        }
                    ],
                    "StartTime": 0,
                    "EndTime": totalTime
                }
            }
        ]
    }; */

    const noLyricsMessage = {
        Type: "Static",
        alternative_api: false,
        offline: false,
        id: Spicetify.Player.data.item.uri.split(":")[2],
        styles: {
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            "flex-direction": "column"
        },
        Lines: [
            {
                Text: "No Lyrics Found"
            }
        ]
    }
    

    storage.set("currentLyricsData", `NO_LYRICS:${Spicetify.Player.data.item.uri.split(":")[2]}`);

    storage.set("currentlyFetching", "false");

    HideLoaderContainer()

    Defaults.CurrentLyricsType = noLyricsMessage.Type;

    if (storage.get("IsNowBarOpen")) {
        document.querySelector<HTMLElement>("#SpicyLyricsPage .ContentBox .LyricsContainer").classList.add("Hidden");
    }

    return noLyricsMessage;
}

function urOfflineMessage() {
    const Message = {
        Type: "Static",
        alternative_api: false,
        offline: true,
        Lines: [
            {
                Text: "You're offline"
            },
            {
                Text: ""
            },
            {
                Text: "[DEF=font_size:small]This extension works only if you're online."
            }
        ]
    };
    

    storage.set("currentlyFetching", "false");

    HideLoaderContainer()

    ClearLyricsPageContainer()


    Defaults.CurrentLyricsType = Message.Type;

    if (storage.get("IsNowBarOpen")) {
        document.querySelector("#SpicyLyricsPage .ContentBox .LyricsContainer").classList.add("Hidden");
    }

    return Message;
}

function DJMessage() {
    const Message = {
        Type: "Static",
        alternative_api: false,
        styles: {
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            "flex-direction": "column"
        },
        Lines: [
            {
                Text: "DJ Mode is On"
            },
            {
                Text: ""
            },
            {
                Text: "[DEF=font_size:small]If you want to load lyrics, please select a Song."
            }
        ]
    };
    

    storage.set("currentlyFetching", "false");

    HideLoaderContainer()

    ClearLyricsPageContainer()

    Defaults.CurrentLyricsType = Message.Type;

    return Message;
}

function NotTrackMessage() {
    const Message = {
        Type: "Static",
        styles: {
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            "flex-direction": "column"
        },
        Lines: [
            {
                Text: "[DEF=font_size:small]You're playing an unsupported Content Type"
            }
        ]
    }

    storage.set("currentlyFetching", "false");

    HideLoaderContainer()

    ClearLyricsPageContainer()

    Defaults.CurrentLyricsType = Message.Type;

    return Message;
}

function ShowLoaderContainer() {
    if (document.querySelector("#SpicyLyricsPage .LyricsContainer .loaderContainer")) {
        document.querySelector("#SpicyLyricsPage .LyricsContainer .loaderContainer").classList.add("active");
    }
}

function HideLoaderContainer() {
    if (document.querySelector("#SpicyLyricsPage .LyricsContainer .loaderContainer")) {
        document.querySelector("#SpicyLyricsPage .LyricsContainer .loaderContainer").classList.remove("active");
    }
}

function ClearLyricsPageContainer() {
    if (document.querySelector("#SpicyLyricsPage .LyricsContainer .LyricsContent")) {
        document.querySelector("#SpicyLyricsPage .LyricsContainer .LyricsContent").innerHTML = "";
    }
}