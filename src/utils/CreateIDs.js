export const genrateLeadID = async () => {
    const prefix = "OMD";
    const suffix = "LD";

    const randomTwoDigit = () => Math.floor(Math.random() * 90 + 10); // 10–99
    const randomLetter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A–Z

    let letters;

    // Retry if the letters are "LD"
    do {
        letters = randomLetter() + randomLetter();
    } while (letters === "LD");

    const firstNumber = randomTwoDigit();
    const secondNumber = randomTwoDigit();

    return `${prefix}${firstNumber}${letters}${secondNumber}${suffix}`;
}

export const generateTeacherID = () => {
    const prefix = "OMD";
    const role = "TH";

    const year = new Date().getFullYear().toString().slice(-2); // e.g., "25" for 2025

    const randomThreeDigit = () => {
        const num = Math.floor(Math.random() * 1000); // 0 to 999
        return num.toString().padStart(3, '0');       // ensures 3 digits (e.g., "007")
    };

    const id = `${prefix}-${role}/${year}/${randomThreeDigit()}`;
    return id;
}