// src/utils/networkPaths.js
/**
 * Network Path Builder for DIONavi
 * Handles the exact folder structure:
 * T:\2026\[Country]\[State]\[Doctor Name]\[MM.YYYY]\[Patient Name]\
 */

const path = require('path');

class NetworkPathBuilder {
  constructor(basePath = process.env.NETWORK_DRIVE_PATH || 'T:\\2026') {
    this.basePath = basePath;
  }

  /**
   * Build the full case path
   * @param {string} country - Country name (e.g., 'MEXICO')
   * @param {string} state - State name (e.g., 'GUADALAJARA')
   * @param {string} doctorName - Doctor's full name (e.g., 'Dr. Yubin Kim')
   * @param {string} patientName - Patient's full name (e.g., 'Marlon Pineda')
   * @param {Date} caseDate - Case date (optional, defaults to current date)
   * @returns {string} Full case path
   */
  buildCasePath(country, state, doctorName, patientName, caseDate = new Date()) {
    // Format date as MM.YYYY
    const month = String(caseDate.getMonth() + 1).padStart(2, '0');
    const year = caseDate.getFullYear();
    const dateFolder = `${month}.${year}`;

    // Build path
    const casePath = path.join(
      this.basePath,
      country,
      state,
      doctorName,
      dateFolder,
      patientName
    );

    return casePath;
  }

  /**
   * Get CBCT folder path
   * @param {string} casePath - Full case path from buildCasePath()
   * @returns {string} CBCT folder path
   */
  getCBCTPath(casePath) {
    return path.join(casePath, 'Tomografía');
  }

  /**
   * Get Scanning folder path
   * @param {string} casePath - Full case path from buildCasePath()
   * @returns {string} Scanning folder path
   */
  getScanningPath(casePath) {
    return path.join(casePath, 'Escaneos');
  }

  /**
   * Get Planning folder path
   * @param {string} casePath - Full case path from buildCasePath()
   * @returns {string} Planning folder path
   */
  getPlanningPath(casePath) {
    return path.join(casePath, 'Planeación');
  }

  /**
   * Get all subfolders for a case
   * @param {string} casePath - Full case path
   * @returns {object} Object with all subfolder paths
   */
  getSubfolders(casePath) {
    return {
      cbct: this.getCBCTPath(casePath),
      scanning: this.getScanningPath(casePath),
      planning: this.getPlanningPath(casePath)
    };
  }

  /**
   * Build complete path structure
   * @param {object} caseData - Case data object
   * @returns {object} Complete path structure
   */
  buildPathStructure(caseData) {
    const {
      country,
      state,
      doctorName,
      patientName,
      caseDate
    } = caseData;

    const casePath = this.buildCasePath(country, state, doctorName, patientName, caseDate);
    const subfolders = this.getSubfolders(casePath);

    return {
      casePath,
      ...subfolders
    };
  }

  /**
   * Validate path format (basic validation)
   * @param {string} casePath - Path to validate
   * @returns {boolean} True if valid
   */
  isValidPath(casePath) {
    // Check if path contains all required parts
    const pathParts = casePath.split(path.sep);
    // Should have: basePath, country, state, doctor, date, patient
    return pathParts.length >= 6;
  }

  /**
   * Format doctor name for folder (remove special chars)
   * @param {string} doctorName - Raw doctor name
   * @returns {string} Formatted doctor name
   */
  formatDoctorName(doctorName) {
    // Keep the format as-is for compatibility with existing structure
    // Example: "Dr. Yubin Kim" stays as "Dr. Yubin Kim"
    return doctorName.trim();
  }

  /**
   * Format patient name for folder (remove special chars)
   * @param {string} patientName - Raw patient name
   * @returns {string} Formatted patient name
   */
  formatPatientName(patientName) {
    // Keep the format as-is
    // Example: "Marlon Pineda" stays as "Marlon Pineda"
    return patientName.trim();
  }
}

module.exports = NetworkPathBuilder;
