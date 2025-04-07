import { Model, DataTypes, Sequelize } from 'sequelize';
import ApiKey from './apiKey.model';
import RegisteredApp from './registeredApp.model';
import RequestLog from './requestLog.model';
import RequestQueue from './requestQueue.model';

class User extends Model {
  public id!: number;
  public email!: string;
  public passwordHash!: string;
  public name!: string;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Associations
  public static associate() {
    User.hasMany(ApiKey, { foreignKey: 'userId', as: 'apiKeys' });
    User.hasMany(RegisteredApp, { foreignKey: 'userId', as: 'registeredApps' });
    User.hasMany(RequestLog, { foreignKey: 'userId', as: 'requestLogs' });
    User.hasMany(RequestQueue, { foreignKey: 'userId', as: 'requestQueue' });
  }

  public static initialize(sequelize: Sequelize) {
    User.init({
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: true
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
      tableName: 'User',
      timestamps: true
    });
  }
}

export default User;
