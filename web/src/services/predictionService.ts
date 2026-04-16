import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface Prediction {
  homePrediction: number;
  awayPrediction: number;
  points: number;
  updatedAt: number;
}

export interface UserPredictions {
  [gameId: string]: Prediction;
}

export const getUserPredictions = async (
  userId: string
): Promise<UserPredictions> => {
  const response = await axios.get(`${API_BASE_URL}/predictions/${userId}`);
  return response.data as UserPredictions;
};

export const getPrediction = async (
  userId: string,
  gameId: number
): Promise<Prediction | null> => {
  const response = await axios.get(`${API_BASE_URL}/predictions/${userId}/${gameId}`);
  return response.data as Prediction | null;
};

export const savePrediction = async (
  userId: string,
  gameId: number,
  homePrediction: number,
  awayPrediction: number
): Promise<void> => {
  await axios.post(`${API_BASE_URL}/predictions`, {
    userId,
    game: gameId,
    homePrediction,
    awayPrediction,
  });
};

export const subscribeToPredictions = (
  userId: string,
  callback: (predictions: UserPredictions) => void
): (() => void) => {
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const fetchPredictions = async () => {
    try {
      const predictions = await getUserPredictions(userId);
      callback(predictions);
    } catch (error) {
      console.error('Error fetching predictions:', error);
    }
  };

  fetchPredictions();
  intervalId = setInterval(fetchPredictions, 30000);

  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
};
