// src/appwrite.js
import { Client, Account, Databases, Storage } from "appwrite";

const client = new Client();

client
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT) // ✅ Vite uses import.meta.env
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID); // ✅ project ID

// Export commonly used services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export default client;
