import { Model, DataTypes, Sequelize, Association } from 'sequelize';
import RegisteredApp from './registeredApp.model';
import RateLimitStrategy from './rateLimitStrategy.model';

class RateLimitConfig extends Model {
  public id!: number;
  public appId!: string;
  public strategyId!: number;
  public requestCount!: number;
  public timeWindowSeconds!: number;
  public additionalParams!: object | null;
  public isOwnerExempt!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Define associations explicitly for TypeScript
  public strategy?: RateLimitStrategy;
  public registeredApp?: RegisteredApp;

  // Declare associations
  public static associations: {
    registeredApp: Association<RateLimitConfig, RegisteredApp>;
    strategy: Association<RateLimitConfig, RateLimitStrategy>;
  };

  // Associations
  public static associate() {
    RateLimitConfig.belongsTo(RegisteredApp, { foreignKey: 'appId', targetKey: 'appId', as: 'registeredApp' });
    RateLimitConfig.belongsTo(RateLimitStrategy, { foreignKey: 'strategyId', as: 'strategy' });
  }

  public static initialize(sequelize: Sequelize) {
    RateLimitConfig.init({
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
      strategyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'RateLimitStrategy',
          key: 'id'
        }
      },
      requestCount: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      timeWindowSeconds: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      additionalParams: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      isOwnerExempt: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
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
      tableName: 'RateLimitConfig',
      timestamps: true
    });
  }
}

export default RateLimitConfig;
