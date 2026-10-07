// Window test question bank, imported from the two Google Forms
// ("Window Test" = easy, "Window Test (Hard) Intro" = hard).
// Each image shows the target, its rotated outline, and options A–D.
//
// The answer key is kept on the server only (backend/app/services/window_test.py)
// so it never reaches the browser.

export type WindowOption = 'A' | 'B' | 'C' | 'D';
export type WindowSet = 'easy' | 'hard';

export interface WindowQuestion {
  id: string;            // stable id used by the admin console and exports
  set: WindowSet;
  number: number;        // question number in its original form
  angle: number;         // rotation in degrees
  prompt: string;
  image: string;
}

export const WINDOW_OPTIONS: WindowOption[] = ['A', 'B', 'C', 'D'];

export const WINDOW_INTROS: Record<WindowSet, { title: string; text: string[]; tips: string[]; example: string; exampleAnswer: WindowOption }> = {
  easy: {
    title: 'House windows',
    text: [
      'You will see a house shape with windows. Some windows are shaded black.',
      'Look at the house, then find the matching rotated version of it.',
    ],
    tips: [
      'The roof (red triangle) shows you which way the house is rotated.',
      "The black windows don't change places. Only the house rotates.",
      'Choose the option that has the same window pattern, just turned.',
    ],
    example: '/window-test/easy/example.png',
    exampleAnswer: 'A',
  },
  hard: {
    title: 'Window grid',
    text: [
      'You will see a square grid of windows. Some windows are shaded black.',
      'Match this window pattern with the correct rotated version.',
    ],
    tips: [
      'The red line shows which side of the square is the base, or bottom.',
      "The windows don't move. Only the whole square rotates.",
      'Look at where the black windows are, and match them after rotation.',
    ],
    example: '/window-test/hard/example.png',
    exampleAnswer: 'A',
  },
};

export const WINDOW_QUESTIONS: WindowQuestion[] = [
  { id: 'easy-01', set: 'easy', number: 1, angle: 45, prompt: "Where will the squares be when the house is rotated 45º?", image: '/window-test/easy/q01.png' },
  { id: 'easy-02', set: 'easy', number: 2, angle: 90, prompt: "Where will the squares be when the house is rotated 90º?", image: '/window-test/easy/q02.png' },
  { id: 'easy-03', set: 'easy', number: 3, angle: 135, prompt: "Where will the squares be when the house is rotated 135º?", image: '/window-test/easy/q03.png' },
  { id: 'easy-04', set: 'easy', number: 4, angle: 270, prompt: "Where will the squares be when the house is rotated 270º?", image: '/window-test/easy/q04.png' },
  { id: 'easy-05', set: 'easy', number: 5, angle: 135, prompt: "Where will the squares be when the house is rotated 135º?", image: '/window-test/easy/q05.png' },
  { id: 'easy-06', set: 'easy', number: 6, angle: 45, prompt: "Where will the squares be when the house is rotated 45º?", image: '/window-test/easy/q06.png' },
  { id: 'easy-07', set: 'easy', number: 7, angle: 180, prompt: "Where will the squares be when the house is rotated 180º?", image: '/window-test/easy/q07.png' },
  { id: 'easy-08', set: 'easy', number: 8, angle: 225, prompt: "Where will the squares be when the house is rotated 225º?", image: '/window-test/easy/q08.png' },
  { id: 'easy-09', set: 'easy', number: 9, angle: 90, prompt: "Where will the squares be when the house is rotated 90º?", image: '/window-test/easy/q09.png' },
  { id: 'easy-10', set: 'easy', number: 10, angle: 180, prompt: "Where will the squares be when the house is rotated 180º?", image: '/window-test/easy/q10.png' },
  { id: 'easy-11', set: 'easy', number: 11, angle: 225, prompt: "Where will the squares be when the house is rotated 225º?", image: '/window-test/easy/q11.png' },
  { id: 'easy-12', set: 'easy', number: 12, angle: 270, prompt: "Where will the squares be when the house is rotated 270º?", image: '/window-test/easy/q12.png' },
  { id: 'hard-01', set: 'hard', number: 1, angle: 45, prompt: "Where will the squares be when the window is rotated 45º?", image: '/window-test/hard/q01.png' },
  { id: 'hard-02', set: 'hard', number: 2, angle: 135, prompt: "Where will the squares be when the window is rotated 135º?", image: '/window-test/hard/q02.png' },
  { id: 'hard-03', set: 'hard', number: 3, angle: 90, prompt: "Where will the squares be when the window is rotated 90º?", image: '/window-test/hard/q03.png' },
  { id: 'hard-04', set: 'hard', number: 4, angle: 180, prompt: "Where will the squares be when the window is rotated 180º?", image: '/window-test/hard/q04.png' },
  { id: 'hard-05', set: 'hard', number: 5, angle: 90, prompt: "Where will the squares be when the window is rotated 90º?", image: '/window-test/hard/q05.png' },
  { id: 'hard-06', set: 'hard', number: 6, angle: 180, prompt: "Where will the squares be when the window is rotated 180º?", image: '/window-test/hard/q06.png' },
  { id: 'hard-07', set: 'hard', number: 7, angle: 135, prompt: "Where will the squares be when the window is rotated 135º?", image: '/window-test/hard/q07.png' },
  { id: 'hard-08', set: 'hard', number: 8, angle: 270, prompt: "Where will the squares be when the window is rotated 270º?", image: '/window-test/hard/q08.png' },
  { id: 'hard-09', set: 'hard', number: 9, angle: 225, prompt: "Where will the squares be when the window is rotated 225º?", image: '/window-test/hard/q09.png' },
  { id: 'hard-10', set: 'hard', number: 10, angle: 45, prompt: "Where will the squares be when the window is rotated 45º?", image: '/window-test/hard/q10.png' },
  { id: 'hard-11', set: 'hard', number: 11, angle: 270, prompt: "Where will the squares be when the window is rotated 270º?", image: '/window-test/hard/q11.png' },
  { id: 'hard-12', set: 'hard', number: 12, angle: 225, prompt: "Where will the squares be when the window is rotated 225º?", image: '/window-test/hard/q12.png' },
];
