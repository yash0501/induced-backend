import { Model, DataTypes, Sequelize } from 'sequelize';
import User from './user.model';
import RegisteredApp from './registeredApp.model';

class RequestQueue extends Model {
  public id!: number;
  public appId!: string;
  public userId!: number;
  public requestHeaders!: object;
  public requestBody!: string | null;
  public requestMethod!: string;
  public requestPath!: string;
  public priority!: number;
  public createdAt!: Date;
  public scheduledAt!: Date | null;
  public processedAt!: Date | null;
  public status!: string;

  // Associations
  public static associate() {
    RequestQueue.belongsTo(RegisteredApp, { foreignKey: 'appId', targetKey: 'appId', as: 'registeredApp' });
    RequestQueue.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  }

  public static initialize(sequelize: Sequelize) {
    RequestQueue.init({
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
      requestHeaders: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      requestBody: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      requestMethod: {
        type: DataTypes.STRING(10),
        allowNull: false
      },
      requestPath: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      priority: {
        type: DataTypes.INTEGER,
        defaultValue: 1
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      scheduledAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      processedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING(20),
        defaultValue: 'pending'
      }
    }, {
      sequelize,
      tableName: 'RequestQueue',
      timestamps: true,
      updatedAt: false
    });
  }
}

export default RequestQueue;
