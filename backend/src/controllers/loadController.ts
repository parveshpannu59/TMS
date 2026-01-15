import { Request, Response } from 'express';
import { Load } from '../models/Load';
import { Truck } from '../models/Truck';
import { Trailer } from '../models/Trailer';
import { Driver } from '../models/Driver';

export class LoadController {
  
  // Create Load
  static async createLoad(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const companyId = (req as any).user.companyId;
      
      const load = new Load({
        ...req.body,
        companyId,
        createdBy: userId,
        status: 'Booked'
      });
      
      await load.save();
      
      res.status(201).json({
        success: true,
        data: load
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // Get All Loads
  static async getAllLoads(req: Request, res: Response) {
    try {
      const companyId = (req as any).user.companyId;
      const { status, driverId, page = 1, limit = 20 } = req.query;
      
      const query: any = { companyId };
      
      if (status) query.status = status;
      if (driverId) query.driverId = driverId;
      
      const loads = await Load.find(query)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));
      
      const total = await Load.countDocuments(query);
      
      res.json({
        success: true,
        data: loads,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // Get Load by ID
  static async getLoadById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const companyId = (req as any).user.companyId;
      
      const load = await Load.findOne({ _id: id, companyId });
      
      if (!load) {
        return res.status(404).json({
          success: false,
          message: 'Load not found'
        });
      }
      
      res.json({
        success: true,
        data: load
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // Assign Load
  static async assignLoad(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { driverId, truckId, trailerId } = req.body;
      const companyId = (req as any).user.companyId;
      
      // Validate all three are provided
      if (!driverId || !truckId || !trailerId) {
        return res.status(400).json({
          success: false,
          message: 'Driver, Truck, and Trailer are all required'
        });
      }
      
      // Verify resources exist and are available
      const [driver, truck, trailer] = await Promise.all([
        Driver.findOne({ _id: driverId, companyId }),
        Truck.findOne({ _id: truckId, companyId }),
        Trailer.findOne({ _id: trailerId, companyId })
      ]);
      
      if (!driver || !truck || !trailer) {
        return res.status(404).json({
          success: false,
          message: 'Driver, Truck, or Trailer not found'
        });
      }
      
      if (truck.status !== 'Available') {
        return res.status(400).json({
          success: false,
          message: 'Truck is not available'
        });
      }
      
      if (trailer.status !== 'Available') {
        return res.status(400).json({
          success: false,
          message: 'Trailer is not available'
        });
      }
      
      if (driver.status === 'On Trip') {
        return res.status(400).json({
          success: false,
          message: 'Driver is already on a trip'
        });
      }
      
      // Update load
      const load = await Load.findOneAndUpdate(
        { _id: id, companyId },
        {
          driverId,
          truckId,
          trailerId,
          status: 'Assigned'
        },
        { new: true }
      );
      
      if (!load) {
        return res.status(404).json({
          success: false,
          message: 'Load not found'
        });
      }
      
      // Update resources status
      await Promise.all([
        Driver.findByIdAndUpdate(driverId, {
          status: 'On Trip',
          currentLoadId: load._id,
          currentTruckId: truckId
        }),
        Truck.findByIdAndUpdate(truckId, {
          status: 'Assigned',
          currentLoadId: load._id,
          currentDriverId: driverId
        }),
        Trailer.findByIdAndUpdate(trailerId, {
          status: 'Assigned',
          currentLoadId: load._id
        })
      ]);
      
      // TODO: Send notification to driver
      
      res.json({
        success: true,
        data: load,
        message: 'Load assigned successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // Update Load Status
  static async updateLoadStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const companyId = (req as any).user.companyId;
      
      const load = await Load.findOneAndUpdate(
        { _id: id, companyId },
        { status },
        { new: true }
      );
      
      if (!load) {
        return res.status(404).json({
          success: false,
          message: 'Load not found'
        });
      }
      
      res.json({
        success: true,
        data: load
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // Update Load
  static async updateLoad(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const companyId = (req as any).user.companyId;
      
      const load = await Load.findOneAndUpdate(
        { _id: id, companyId },
        req.body,
        { new: true }
      );
      
      if (!load) {
        return res.status(404).json({
          success: false,
          message: 'Load not found'
        });
      }
      
      res.json({
        success: true,
        data: load
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // Delete Load
  static async deleteLoad(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const companyId = (req as any).user.companyId;
      const userRole = (req as any).user.role;
      
      // Only Owner can delete
      if (userRole !== 'Owner') {
        return res.status(403).json({
          success: false,
          message: 'Only owners can delete loads'
        });
      }
      
      const load = await Load.findOneAndDelete({ _id: id, companyId });
      
      if (!load) {
        return res.status(404).json({
          success: false,
          message: 'Load not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Load deleted successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}