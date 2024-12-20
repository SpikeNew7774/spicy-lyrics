export function ApplyLyricsCredits(data) {
    const LyricsContainer = document.querySelector("#SpicyLyricsPage .LyricsContainer .LyricsContent");
    if (!data?.SongWriters) return;
    const CreditsElement = document.createElement("div");
    CreditsElement.classList.add("Credits");
  
    const SongWriters = data.SongWriters.join(", ");
    CreditsElement.textContent = `Song Writers: ${SongWriters}`
    LyricsContainer.appendChild(CreditsElement);
}