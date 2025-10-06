# **Memecoin Scanner \- Technical Specification**

## **1\. Overview**

This document outlines the technical specification for the Memecoin Scanner application. The project's primary goal is to create a server-side application that automatically scrapes data for new and trending memecoins from Dexscreener, converts this data into a structured JSON format, and exposes it through a dedicated API endpoint. The data will be refreshed automatically every 5 minutes to provide near real-time insights.

The application will be built using Next.js 15, leveraging its API routes for backend functionality and preparing for a potential frontend interface in the future.

## **2\. Core Features**

* **Automated Web Scraping:** The application will scrape coin data from a specific, pre-filtered Dexscreener URL for the Solana chain.  
* **Data Extraction:** It will extract key information for each coin, such as name, symbol, price, liquidity, market cap, and 24-hour volume.  
* **JSON API Endpoint:** A public-facing API endpoint will be created to serve the scraped data in a clean, structured JSON format.  
* **Scheduled Auto-Refresh:** A cron job will trigger the scraping process every 5 minutes to ensure the data remains up-to-date.  
* **Scalable Architecture:** The system will be designed to run efficiently in a serverless environment, ensuring scalability and cost-effectiveness.

## **3\. Technology Stack**

* **Framework:** Next.js 15 (App Router)  
* **Primary Language:** TypeScript  
* **Web Scraping:** Puppeteer (puppeteer-core) for headless browser control to handle dynamic, JavaScript-rendered content.  
* **HTML Parsing:** Cheerio to parse the raw HTML from the headless browser and extract data using jQuery-like selectors.  
* **Scheduling:** Vercel Cron Jobs for serverless, time-based task scheduling.  
* **Deployment:** Vercel

## **4\. System Architecture and Flow**

The application will operate in a simple, linear flow, triggered by the scheduler.

**Flow Description:**

1. **Trigger:** A Vercel Cron Job is configured to send a GET request to a protected scraping API endpoint (/api/scrape) every 5 minutes.  
2. **Scrape:** The /api/scrape endpoint initiates the scraping process.  
   * It launches a headless instance of Puppeteer.  
   * Navigates to the target Dexscreener URL: https://dexscreener.com/solana?rankBy=trendingScoreM5\&order=desc\&minLiq=10000\&minMarketCap=10000\&maxMarketCap=250000\&min24HVol=50000.  
   * Waits for the coin list to be fully rendered on the page by the client-side JavaScript.  
   * Extracts the page's complete HTML content.  
3. **Parse & Structure:**  
   * The HTML content is loaded into Cheerio.  
   * The script iterates through each coin listed on the page, using specific CSS selectors to find and extract the required data points.  
   * This data is compiled into an array of structured JSON objects.  
4. **Cache Data:**  
   * The resulting JSON array is stored in a temporary cache (e.g., Vercel's Data Cache or written to a temporary file) to be accessed by the public API. This decouples the scraping process from the data-serving process, ensuring the public API is fast and doesn't wait for a scrape to complete.  
5. **Serve Data:**  
   * A public API endpoint (/api/coins) is available for clients.  
   * When a request is received, this endpoint reads the latest data from the cache and returns it as a JSON response.

## **5\. Data Model**

The data scraped for each coin will be structured into a JSON object. An array of these objects will be the final output of the API.

**Coin Object Example:**

* {  
*   "pairAddress": "string",  
*   "name": "string",  
*   "symbol": "string",  
*   "priceUsd": "number",  
*   "liquidity": "number",  
*   "marketCap": "number",  
*   "volume24h": "number",  
*   "priceChange24h": "number",  
*   "dexscreenerUrl": "string",  
*   "timestamp": "ISO 8601 string"  
* }

## **6\. API Endpoint Specification**

### **6.1. Scraper Endpoint (Protected)**

This endpoint is for internal use, triggered only by the cron job. It should be protected to prevent public abuse, for example by checking a secret token passed in the request.

* **Endpoint:** GET /api/scrape  
* **Function:** Triggers the scraping and data caching process.  
* **Success Response (200):**  
* { "status": "success", "message": "Data scraped successfully.", "coinCount": 20 }  
*   
* **Error Response (500):**  
* { "status": "error", "message": "Failed to scrape data." }  
* 

### **6.2. Public Data Endpoint**

This endpoint provides the latest cached data to the end-user or client application.

* **Endpoint:** GET /api/coins  
* **Function:** Returns the latest list of scanned memecoins.  
* **Success Response (200):**  
* {  
*   "lastUpdated": "2025-10-26T10:05:00Z",  
*   "data": \[  
*     {  
*       "pairAddress": "SOLpA...",  
*       "name": "Awesome Coin",  
*       "symbol": "AWC",  
*       "priceUsd": 0.000123,  
*       "liquidity": 15000,  
*       "marketCap": 123000,  
*       "volume24h": 65000,  
*       "priceChange24h": 45.5,  
*       "dexscreenerUrl": "\[https://dexscreener.com/solana/\](https://dexscreener.com/solana/)...",  
*       "timestamp": "2025-10-26T10:05:00Z"  
*     }  
*   \]  
* }  
*   
*


## Progress

- Tests added and passing locally.
- Merge script available at `scripts/merge-parsed-coins.ts`.
