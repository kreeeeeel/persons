import localFont from "next/font/local";

export const personsFont = localFont({
    src: "./fonts/GolosText.woff2",
    weight: "400 900",
    style: "normal",
    display: "swap",
    variable: "--font-persons",
});
