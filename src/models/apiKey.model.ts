import { Model, DataTypes, Sequelize } from 'sequelize';
import User from './user.model';

class ApiKey extends Model {
  public id!: number;
  public userId!: number;
  public keyValue!: string;
  public isActive!: boolean;
  public createdAt!: Date;
  public lastUsedAt!: Date | null;

  // Associations
  public static associate() {
    ApiKey.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  }

  public static initialize(sequelize: Sequelize) {
    ApiKey.init({
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'User',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      keyValue: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      lastUsedAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    }, {
      sequelize,
      tableName: 'ApiKey',
      timestamps: true,
      updatedAt: false
    });
  }
}

export default ApiKey;
