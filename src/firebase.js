import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ⚠️ 請將下方的物件替換為你在 Firebase Console 複製的內容
const firebaseConfig = {
  apiKey: "AIzaSyB9wTEF80N6gQC82A2OLuIij4k4TIxCIlc",
  authDomain: "fengyuan-handbook.firebaseapp.com",
  projectId: "fengyuan-handbook",
  storageBucket: "fengyuan-handbook.firebasestorage.app",
  messagingSenderId: "611897296630",
  appId: "1:611897296630:web:24958a6cf6cce57633ced7"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 重點：必須將 auth 和 db 匯出，這樣 App.jsx 才能使用
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;