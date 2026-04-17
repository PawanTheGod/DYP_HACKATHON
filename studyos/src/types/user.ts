import { UserProfile } from './index';

export type UserEnergyPeak = 'morning' | 'afternoon' | 'night';

export interface OnboardingState {
  currentStep: number;
  data: Partial<UserProfile>;
}
