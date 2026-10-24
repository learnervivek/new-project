import api from '../lib/api';

/**
 * AI Itinerary Generator API Service Layer
 */
export const aiService = {
  /**
   * Request Gemini to generate a structured day-by-day travel itinerary
   * @param {Object} formData
   */
  async generateItinerary(formData) {
    const response = await api.post('/ai/itinerary/generate', formData);
    return response.data;
  },

  /**
   * Request Gemini to regenerate activities for a single day
   * @param {Object} data
   */
  async regenerateDay(data) {
    const response = await api.post('/ai/itinerary/regenerate-day', data);
    return response.data;
  },

  /**
   * Persist the generated plan to MongoDB as a collaborative Trip
   * @param {Object} itinerary
   */
  async saveItinerary(itinerary) {
    const response = await api.post('/ai/itinerary/save', itinerary);
    return response.data;
  },
};

export default aiService;
