import { Model, DataTypes, Sequelize } from 'sequelize';
import User from './user.model';
import RegisteredApp from './registeredApp.model';

class RequestLog extends Model {
  public id!: number;
  public appId!: string;
  public userId!: number;
  public requestPath!: string;
  public requestMethod!: string;
  public responseStatus!: number | null;
  public processingTimeMs!: number | null;
  public queued!: boolean;
  public queueTimeMs!: number;
  public timestamp!: Date;

  // Associations
  public static associate() {
    RequestLog.belongsTo(RegisteredApp, { foreignKey: 'appId', targetKey: 'appId', as: 'registeredApp' });
    RequestLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  }

  public static initialize(sequelize: Sequelize) {
    RequestLog.init({
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      appId: {
        type: DataTypes.STRING(36),
        allowNull: false,
        references: {
          model: 'RegisteredApp',
          key: 'appId'
        }
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'User',
          key: 'id'
        }
      },
      requestPath: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      requestMethod: {
        type: DataTypes.STRING(10),
        allowNull: false
      },
      responseStatus: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      processingTimeMs: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      queued: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      queueTimeMs: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, {
      sequelize,
      tableName: 'RequestLog',
      timestamps: false
    });
  }
}

export default RequestLog;
