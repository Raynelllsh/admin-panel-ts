// src/utils/adminConstants.ts

export const MAX_STUDENTS = 8;

export const DEFAULT_LESSON_NAMES: string[] = [
  "故事起航 - 認識自我與舞台",
  "句子結構大師 - 清晰表達",
  "圖片說故事 - Show and Tell",
  "禮儀小達人 - 優雅與尊重",
  "故事結構大挑戰 - 圖卡排序",
  "故事連貫大師 - 連接詞應用",
  "形容詞魔法 - 豐富故事描述",
  "故事與情感 - 聲音與表情",
  "創意故事編織 - 想像力啟動",
  "即興創作 - 快速應變",
  "創意畫作分享 - 繪畫與內心表達",
  "故事演講家 - 學習成果演示",
];

export const addDays = (dateStr: string, days: number): string => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
};

export const formatDateDisplay = (dateStr: string | undefined): string => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  return `${parseInt(parts[2])}/${parseInt(parts[1])}`;
};

export const getCategoryFromId = (courseId: string | undefined): string => {
  if (!courseId || courseId.length < 4) return "OTHERS";
  return courseId.substring(0, 4).toUpperCase();
};
