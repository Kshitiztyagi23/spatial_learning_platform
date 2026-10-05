export type DirectionOption = 'Right' | 'Left' | 'Front' | 'Behind';

export interface PerspectiveQuestion {
  id: number;
  questionNumber: number; // 1 to 12
  text: string;
  points: number; // 1
  options: DirectionOption[];
  correctAnswer: DirectionOption;
}

export interface ScenarioImage {
  id: number; // 1 to 6
  label: string; // e.g., "View 1: Overview", "View 2: North Angle", etc.
  src: string;
  description?: string;
}

export interface Scenario {
  id: number; // 1 to 8
  title: string;
  context: string;
  images: ScenarioImage[];
  questions: PerspectiveQuestion[];
}
