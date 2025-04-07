import { Model, DataTypes, Sequelize, Association } from 'sequelize';
import User from './user.model';
import RateLimitConfig from './rateLimitConfig.model';
import RequestLog from './requestLog.model';
import RequestQueue from './requestQueue.model';

class RegisteredApp extends Model {
  public id!: number;
  public appId!: string;
  public userId!: number;
  public name!: string;
  public baseUrl!: string;
  public description!: string | null;
  public apiKey!: string | null;
  public isApiKeyEncrypted!: boolean;
  public apiKeyHeaderName!: string;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Define associations explicitly for TypeScript
  public rateLimitConfig?: RateLimitConfig;

  // Declare associations
  public static associations: {
    user: Association<RegisteredApp, User>;
    rateLimitConfig: Association<RegisteredApp, RateLimitConfig>;
    requestLogs: Association<RegisteredApp, RequestLog>;
    requestQueue: Association<RegisteredApp, RequestQueue>;
  };

  // Associations
  public static associate() {
    RegisteredApp.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    RegisteredApp.hasOne(RateLimitConfig, { foreignKey: 'appId', sourceKey: 'appId', as: 'rateLimitConfig' });
    RegisteredApp.hasMany(RequestLog, { foreignKey: 'appId', sourceKey: 'appId', as: 'requestLogs' });
    RegisteredApp.hasMany(RequestQueue, { foreignKey: 'appId', sourceKey: 'appId', as: 'requestQueue' });
  }

  public static initialize(sequelize: Sequelize) {
    RegisteredApp.init({
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      appId: {
        type: DataTypes.STRING(36),
        allowNull: false,
        unique: true
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'User',
          key: 'id'
        }
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      baseUrl: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      apiKey: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      isApiKeyEncrypted: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      apiKeyHeaderName: {
        type: DataTypes.STRING(100),
        defaultValue: 'Authorization'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, {
      sequelize,
      tableName: 'RegisteredApp',
      timestamps: true
    });
  }
}

export default RegisteredApp;
