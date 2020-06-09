const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const Sequelize = require('sequelize');
const sequelize = new Sequelize('mysql://root:Tadeo123@localhost:3306/DelilahResto');
const jwt = require('jsonwebtoken');
const firma = "resto123";
const moment = require('moment');
const bcrypt = require('bcrypt');
const saltRounds = 10;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(3001, () => {
     console.log('escuchado papu')
});



//USUARIO


const crearUsuario = async (req, res) => {
     let usuario = req.body;
     usuario.password = await bcrypt.hash(usuario.password, saltRounds);
     usuario.es_administrador = 0;
     sequelize.query(
          "INSERT INTO usuarios (usuario, password, nombre, apellido, mail, telefono, direccion, es_administrador) VALUES (:usuario, :password, :nombre, :apellido, :mail, :telefono, :direccion, :es_administrador) ",
          { replacements: usuario }
     )
          .then((respuesta) => {
               res.status(201).send("Usuario creado");
          })
          .catch((error) => {
               res.status(500).send(error);
          });
};
const logIn = async (req, res) => {
     let user = req.body;
     sequelize.query(`SELECT * FROM usuarios WHERE usuario = '${user.usuario}' OR mail = '${user.mail}'`, { type: sequelize.QueryTypes.SELECT }
     )
          .then(async (userLogin) => {
               console.log(userLogin)
               let coinciden = await bcrypt.compareSync(user.password, userLogin[0].password);
               if (coinciden) {
                    res.json({
                         token: (
                              token = jwt.sign(userLogin[0], firma)
                         )
                    });
               } else {
                    res.status(401).send("Usuario o contraseña no válido");
               }
          })
          .catch((error) => {
               res.status(500).send("mail o usuario invalido");
          });
};
const traerUsurarios = (req, res) => {
     sequelize.query('SELECT * FROM usuarios')
          .then((usuarios) => {
               res.status(200).json(usuarios[0])
          }).catch((error) => {
               res.status(500).send(error);
               console.log("salio por aca rey");
          })

};



const userInfoOk = async (req, res, next) => {
     let user = {
          usuario: req.body.usuario,
          password: req.body.password,
          nombre: req.body.nombre,
          apellido: req.body.apellido,
          mail: req.body.mail,
          telefono: req.body.telefono,
          direccion: req.body.direccion,
          es_administrador: 0
     }
     if (user) {
          next();
     }
     else {
          res.status(401).send("Algunos de los datos no son correctos")
     }
};
const dataLogin = (req, res, next) => {
     let user = req.body
     if ((user.usuario || user.email) && user.password) {
          next();
     } else {
          res.status(401).send('Usuario o email incorrecto')
     };
};
function tokenUsuarios(req, res, next) {
     const token = req.headers.authorization.split(' ')[1];
     const usuario = jwt.verify(token, firma);
     if (usuario) {
          req.usuario = usuario;
          next();
     } else {
          res.status(401).send('usuario no tiene permisos para acceder a esta informacion')
     }
};
function tokenAdmin(req, res, next) {
     const token = req.headers.authorization.split(' ')[1];
     const usuario = jwt.verify(token, firma);
     if (usuario.es_administrador.data[0] === 1) {
          req.usuario = usuario;
          next();
     } else {
          res.status(401).send('usuario invalido')
     }
};


app.post('/usuarios', userInfoOk, crearUsuario);
app.get('/usuarios', tokenAdmin, traerUsurarios);
app.post('/login', dataLogin, logIn);





//PRODUCTOS
const createProducto = (req, res) => {
     let plato = req.body;
     plato.disponible = 1;
     sequelize.query(
          "INSERT INTO productos (nombre, precio, urlFoto, en_stock) VALUES (:nombre, :precio, :urlFoto, :en_stock)",
          { replacements: plato }
     )
          .then((respuesta) => {

               res.status(201).send('Plato: ' + plato.nombre + ' ,agregado a la DB');
          })
          .catch((error) => {
               res.status(500).send('Plato no agregado por: ' + error);
          });
};
const deleteProducto = (req, res) => {
     let plato = req.body;
     sequelize.query("DELETE FROM productos WHERE id = :id", {
          replacements: plato
     })
          .then((respuesta) => {

               res
                    .status(200)
                    .send(
                         "Plato con el id:  " + plato.id + " eliminado de la DB"
                    );
          })
          .catch((error) => {
               res.status(401).send('No se pudo eliminar el plato por: ' + error);
          });
};
const updateProducto = (req, res) => {
     let plato = req.body;
     sequelize.query(
          "UPDATE productos SET nombre = ?, precio = ?, urlFoto = ?, en_stock = ? WHERE id = ?",
          {
               replacements: [
                    plato.nombre,
                    plato.precio,
                    plato.urlFoto,
                    plato.en_stock,
                    plato.id
               ]
          }
     )
          .then((plato) => {
               res.status(203).send('Se actualizaron los datos correctamente');
          })
          .catch((error) => {
               res.status(500).send('Datos no actualizados por: ' + error);
          });
};
const getAllProductos = (req, res) => {
     sequelize.query("SELECT * FROM productos WHERE en_stock = 1")
          .then((platos) => {
               res.status(200).json(platos[0]);
          })
          .catch((error) => {
               res.status(401).send('Usuario no logueado');
          });
};


const datosProducto = async (req, res, next) => {
     let plato = req.body;
     if (plato.nombre && plato.precio) {
          next();
     } else {
          res.status(401).send("Algunos de los datos no son correctos");
     }
};
const productoExiste = (req, res, next) => {

     let plato = req.body;
     sequelize.query('SELECT * FROM productos Where id = :id',
          { replacements: plato, type: sequelize.QueryTypes.SELECT })
          .then((respuesta) => {
               if (respuesta[0].id !== null) {
                    next();
               }

          }).catch((error) => {
               res.status(404).send('middleware platoExiste' + error)
          });
};


app.post('/productos', tokenAdmin, datosProducto, createProducto);
app.put('/productos', tokenAdmin, productoExiste, updateProducto);
app.delete('/productos', tokenAdmin, deleteProducto);
app.get('/productos', tokenUsuarios, getAllProductos);


// PEDIDOS

const newPedido = (req, res) => {
     let usuario = req.usuario;
     let hora = moment().format('YYYY-MM-DD HH:mm:ss');
     let newPedido = req.body
     let detalle = newPedido.detalle
     sequelize.query(
          "INSERT INTO pedidos (idUsuario,idFormaDePago,hora,pagado) VALUES (?,?,?,?)",
          {
               replacements: [usuario.id, newPedido.idFormaDePago, hora,1]
          }).then(async (respuesta) => {
               let idPedido = respuesta[0];
               insertDetalle(detalle, idPedido)
                    .then((respuesta) => {
                         return upDateTotal(respuesta, idPedido)
                    }).catch((error) => {
                         console.log(error + ' error de promesas')
                    })
               res.status(200).send(' pedido insertado')
          }).catch((error) => {
               res.status(500).send('catch insert pedidos' + error)
          });
};
function getPrecioPlato(idProducto) {
     return new Promise(function (resolve, reject) {
          sequelize.query('SELECT precio FROM productos WHERE id = ?',
               { replacements: [idProducto], type: sequelize.QueryTypes.SELECT })
               .then((respuesta) => {
                    if (respuesta.length !== 0) {
                         resolve(respuesta[0]);
                    }
               }).catch((error) => {
                    reject('plato no existe' + error)
               });
     });
};
function insertDetalle(detalle, idPedido) {
     return new Promise(function (resolve, reject) {
          let total = 0;
          detalle.forEach(async function (element) {
               let precio = await getPrecioPlato(element.idPlato);
               let precio_subtotal = precio.precio * element.cantidad;
               total = total + precio_subtotal;
               sequelize.query('INSERT INTO detalle_pedido (idPedido, idProducto, cantidad, precio_total) VALUES (?, ?, ?, ?)',
                    {
                         replacements: [idPedido, element.idPlato, element.cantidad, precio.precio * element.cantidad]
                    }).then((respuesta) => {
                         console.log(total);
                         resolve(total)
                    }).catch((error) => {
                         console.log('catch del foreach' + error);
                         reject(error + 'catch del foreach')
                    });
          })
     })
};
function upDateTotal(total, idPedido) {
     sequelize.query('UPDATE pedidos SET precioTotal = ? WHERE id = ? ',
          { replacements: [total, idPedido] })
          .then((respuesta) => {

          }).catch((error) => {
               console.log(error + 'catch del update')
          }).catch((error) => {
               reject(error + ' calcular total')
          });

};
const upDateEstadoPedido = (req, res) => {
     let hora = moment().format("YYYY-MM-DD HH:mm:ss");
     let estadoNuevo = req.body.idEstado;
     let pedido = req.body.idPedido;
     let usuario = req.usuario;
     console.log(req.body);
     
     sequelize.query('SELECT idEstado FROM pedidos WHERE id = ?',
          { replacements: [pedido], type: sequelize.QueryTypes.SELECT })
          .then((respuesta) => {
               if ((respuesta[0].idEstado === estadoNuevo)) {
                    res.status(401).send('Estado no se puede cambiar porque es el mismo')
               } else {
                    sequelize.query('UPDATE pedidos SET idEstado = ?, hora = ? WHERE id= ?', {
                         replacements: [estadoNuevo, hora, pedido]
                    })
                         .then((respuesta) => {
                              res.json({
                                   estadoActual: estadoNuevo,
                                   respuesta: respuesta[0],
                                   dateTime: hora,
                                   usuario: usuario.id
                              });
                         })
                         .catch((error) => {
                              res.json({ error: error });
                         });
               }
          }).catch((error) => {
               res.status(500).send(error + 'catch del select estado')
          });
};
const deletePedido = (req, res) => {
     let pedido = req.body.idPedido
     sequelize.query("DELETE FROM pedidos WHERE id = ?", {
          replacements: [pedido]
     })
          .then((respuesta) => {
               res.status(200).send('eliminado de la DB');
          })
          .catch((error) => {
               res.status(401).send('No se pudo eliminar el pedido por: ' + error);
          });
};
const getAllPedidos = (req, res) => {
     sequelize.query(`SELECT e.descripcion, p.hora, p.id AS idPedido, dp.cantidad, pl.nombre, f.descripcion,
     p.precioTotal, u.nombre, u.apellido, u.direccion
     FROM pedidos p
     JOIN estados e
     JOIN detalle_pedido dp ON dp.idPedido = p.id
     JOIN productos pl ON dp.idProducto = pl.id
     JOIN formas_de_pago f ON p.idFormaDePago = f.id
     JOIN usuarios u ON p.idUsuario = u.id
     ORDER BY e.id ASC`).then((respuesta) => {
          let pedidos = respuesta[0];
          console.log(pedidos);
          let listaPedidosById = pedidos.reduce(function (r, element) {
               r[element.idPedido] = r[element.idPedido] || [];
               r[element.idPedido].push(element);
               return r;
          }, Object.create(null));
          res.json(listaPedidosById)

     }).catch((error) => {
          res.status(500).send(error + console.log("catch del getAllPedidos"))
     });
};


const productosPedidos = (req, res, next) => {
     let productosPedidos = req.body.detalle
     if (productosPedidos.length > 0) {
          next();
     } else {
          res.status(500).send('Invalid request')
     }
};

app.post('/pedidos', tokenUsuarios, productosPedidos, newPedido);
app.get('/pedidos', tokenAdmin, getAllPedidos);
app.patch('/pedidos', tokenAdmin, upDateEstadoPedido);
app.delete('/pedidos', tokenAdmin, deletePedido);