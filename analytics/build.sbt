name := "ResQCare-Analytics-Engine"

version := "1.0.0"

scalaVersion := "2.12.18"

val sparkVersion = "3.5.1"

libraryDependencies ++= Seq(
  "org.apache.spark" %% "spark-core" % sparkVersion,
  "org.apache.spark" %% "spark-sql" % sparkVersion,
  "org.apache.spark" %% "spark-streaming" % sparkVersion,
  "mysql" % "mysql-connector-java" % "8.0.33",
  "com.typesafe" % "config" % "1.4.3"
)
