import Settings from '../models/Settings.js';
import { validationResult } from 'express-validator';

// Get settings (singleton - only one settings document exists)
export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    if (!settings) {
      // Create default settings if none exist
      settings = await Settings.create({});
    }
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching settings', 
      error: error.message 
    });
  }
};

// Update settings
export const updateSettings = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create(req.body);
    } else {
      Object.assign(settings, req.body);
      await settings.save();
    }
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating settings', 
      error: error.message 
    });
  }
};

// Get specific settings section
export const getSettingsSection = async (req, res) => {
  try {
    const { section } = req.params;
    const settings = await Settings.findOne();
    
    if (!settings) {
      return res.status(404).json({ message: 'Settings not found' });
    }
    
    const sectionData = settings[section];
    if (sectionData === undefined) {
      return res.status(404).json({ message: 'Settings section not found' });
    }
    
    res.json({ [section]: sectionData });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching settings section', 
      error: error.message 
    });
  }
};

// Update specific settings section
export const updateSettingsSection = async (req, res) => {
  try {
    const { section } = req.params;
    const settings = await Settings.findOne();
    
    if (!settings) {
      return res.status(404).json({ message: 'Settings not found' });
    }
    
    if (settings[section] === undefined) {
      return res.status(404).json({ message: 'Settings section not found' });
    }
    
    settings[section] = { ...settings[section], ...req.body };
    await settings.save();
    
    res.json({ [section]: settings[section] });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating settings section', 
      error: error.message 
    });
  }
};

// Reset settings to defaults
export const resetSettings = async (req, res) => {
  try {
    await Settings.deleteMany({});
    const settings = await Settings.create({});
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error resetting settings', 
      error: error.message 
    });
  }
};

// Get system info
export const getSystemInfo = async (req, res) => {
  try {
    const settings = await Settings.findOne();
    const systemInfo = {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: 'MongoDB',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      company: settings?.company || null,
      features: {
        multiWarehouse: true,
        barcodeSupport: true,
        notifications: true,
        reporting: true,
        multiLanguage: settings?.general?.supportedLanguages?.length > 1 || false,
        multiCurrency: settings?.general?.supportedCurrencies?.length > 1 || false
      }
    };
    
    res.json(systemInfo);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching system info', 
      error: error.message 
    });
  }
};